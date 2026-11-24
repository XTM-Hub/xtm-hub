import { v4 as uuidv4 } from 'uuid';
import {
  OrganizationInput,
  OrganizationMemberConnection,
  QueryOrganizationMembersArgs,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { dispatch } from '../../../pub';
import { securityGuard } from '../../../security/guard';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode, UnknownErrorCode } from '../../../utils/error/error.code';
import { isUuid } from '../../../utils/uuid.util';
import { PlatformConfigurationDomain } from '../../registration/platform-configuration/platform-configuration.domain';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../telemetry/telemetry.helper';
import { UserDomain } from '../user/user-domain/user.domain';
import {
  assertOrganizationHasNoPendingUsers,
  organizationWouldLoseLastMember,
} from './organization-membership.util';
import { OrganizationDomain } from './organization.domain';
import { isUserRestrictedToOwnOrganizationMembers } from './organization.security';

// Each page is one query: the size a caller asks for is bounded so it cannot make it list every member at once.
const ORGANIZATION_MEMBERS_MAX_PAGE_SIZE = 100;

export const OrganizationApp = {
  /**
   * An organization the caller may not read the members of answers ORGANIZATION_NOT_FOUND, exactly as an unknown or
   * malformed id, so that a refused id cannot be told from a missing one.
   */
  async loadOrganizationMembers(
    organizationId: OrganizationId,
    {
      first,
      after,
      searchTerm,
    }: Omit<QueryOrganizationMembersArgs, 'organizationId'>
  ): Promise<OrganizationMemberConnection> {
    // A malformed id would make PostgreSQL fail on the uuid cast, membership check included: refuse it before any query
    if (!isUuid(organizationId)) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }
    // Security: without READ_ORGANIZATION_MEMBERS, the caller reads the members of their own organizations only
    const user = requestContext.requireUser();
    if (
      isUserRestrictedToOwnOrganizationMembers(user) &&
      !(await securityGuard.isUserInOrganization(user, organizationId))
    ) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }
    // Data: the organization itself, a personal space for BYPASS only
    const organization =
      await OrganizationDomain.loadFirstProfessionalOrganizationBy({
        id: organizationId,
      });
    if (!organization) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }
    // Feature: the page of members, restricted again in the query
    return UserDomain.loadOrganizationMemberConnection(organization.id, {
      // 0 is a valid page size: no member, but the totalCount. A negative one is brought to 0
      first: Math.min(Math.max(0, first), ORGANIZATION_MEMBERS_MAX_PAGE_SIZE),
      after,
      searchTerm,
    });
  },

  async updateOrganization(id: OrganizationId, input: OrganizationInput) {
    const updatedOrganization = await OrganizationDomain.updateOrganizationBy(
      { id },
      { ...input }
    );

    if (!updatedOrganization) {
      throw new Error(UnknownErrorCode.EditOrganizationError);
    }

    try {
      const user = requestContext.requireUser();
      const updateOrgaEvent = TelemetryHelper.buildUpdateOrganizationEvent(
        updatedOrganization,
        user.id
      );
      await TelemetryApp.sendTelemetryEvent(updateOrgaEvent);
    } catch (error) {
      logApp.error('Unable to send telemetry event for update organization', {
        error,
      });
    }

    return updatedOrganization;
  },

  async createOrganization(input: OrganizationInput) {
    const existingOrganization =
      await OrganizationDomain.loadOrganizationByLikeName(input.name);
    if (existingOrganization?.id) {
      throw new Error(ErrorCode.OrganizationSameNameExists);
    }

    const overlappingDomains = await OrganizationDomain.hasDomainOverlap(
      input.domains ?? []
    );
    if (overlappingDomains.length > 0) {
      throw new Error(ErrorCode.OrganizationSameDomainExists);
    }

    const createdOrganization = await OrganizationDomain.insertNewOrganization({
      id: uuidv4() as OrganizationId,
      ...input,
    });

    try {
      const user = requestContext.requireUser();
      const createOrgaEvent = TelemetryHelper.buildCreateOrganizationEvent(
        createdOrganization,
        user.id
      );
      await TelemetryApp.sendTelemetryEvent(createOrgaEvent);
    } catch (error) {
      logApp.error('Unable to send telemetry event for create organization', {
        error,
      });
    }

    return createdOrganization;
  },

  async deleteOrganization(id: OrganizationId) {
    const organization = await OrganizationDomain.loadOrganizationBy({ id });
    if (!organization) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }

    if (!organization.personal_space) {
      await assertOrganizationHasNoPendingUsers(
        id,
        ErrorCode.DeleteOrganizationPendingUsers
      );

      if (!(await organizationWouldLoseLastMember(id))) {
        throw new Error(ErrorCode.DeleteOrganizationRequiresSingleUser);
      }

      const connectedProductCount =
        await PlatformConfigurationDomain.countConfigurationsByOrganization(id);
      if (connectedProductCount > 0) {
        throw new Error(ErrorCode.DeleteOrganizationBlockedByConnectedProduct);
      }
    }

    const deletedOrganization = await OrganizationDomain.deleteOrganizationBy({
      id,
    });
    if (!deletedOrganization) {
      throw new Error(UnknownErrorCode.DeleteOrganizationError);
    }

    await dispatch('Organization', 'delete', deletedOrganization);

    return deletedOrganization;
  },
};
