import { v4 as uuidv4 } from 'uuid';
import { OrganizationInput } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { dispatch } from '../../../pub';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode, UnknownErrorCode } from '../../../utils/error/error.code';
import { PlatformConfigurationDomain } from '../../registration/platform-configuration/platform-configuration.domain';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../telemetry/telemetry.helper';
import {
  assertOrganizationHasNoPendingUsers,
  organizationWouldLoseLastMember,
} from './organization-membership.util';
import { OrganizationDomain } from './organization.domain';

export const OrganizationApp = {
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
