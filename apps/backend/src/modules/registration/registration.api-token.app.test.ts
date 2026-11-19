import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextRegistererUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  ApiTokenScope,
  OrganizationCapability,
  PlatformContract,
  PlatformIdentifier,
  PlatformInput,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../model/kanel/public/Organization';
import User from '../../model/kanel/public/User';
import { ErrorCode } from '../../utils/error/error.code';
import { UserProvisioningDomain } from '../organization-management/user/user-provisioning/user-provisioning.domain';
import { UserHelper } from '../organization-management/user/user.helper';
import { RegistrationApp } from './registration.app';

const SECOND_ORGANIZATION_ID = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;

const buildPlatform = (): PlatformInput => ({
  id: uuidv4(),
  title: 'My OpenCTI platform',
  url: 'http://example.com',
  contract: PlatformContract.Ee,
  version: '1.0.0',
});

// registerPlatform and unregisterPlatform carry @auth only: their capability check reads the database, not the
// token user. The user registers platforms in two organizations, and the admin scope keeps that capability, so a
// refusal comes from the organization the token is pinned to.
describe('registration app with an API token', () => {
  let otherOrganization: Organization;
  let user: User;

  const addRegisterer = async (organizationId: OrganizationId) => {
    const userOrganization = await TestHelper.user_Organization.create({
      user_id: user.id,
      organization_id: organizationId,
    });
    await TestHelper.user_OrganizationCapability.create({
      user_organization_id: userOrganization!.id,
      name: OrganizationCapability.ManagePlatformRegistration,
    });
  };

  beforeEach(async () => {
    otherOrganization = await TestHelper.organization.create();
    user = await UserProvisioningDomain.createUser(
      {
        email: `api-token-registration-${uuidv4()}@api-token-registration-test.io`,
      },
      { sendWelcomeEmail: false }
    );
    await addRegisterer(SECOND_ORGANIZATION_ID);
    await addRegisterer(otherOrganization.id);
  });

  afterEach(async () => {
    await UserHelper.removeUser({ id: user.id });
    await TestHelper.organization.delete({ id: otherOrganization.id });
  });

  it('should refuse registering a platform in an organization other than the token one', async () => {
    // Given
    await TestHelper.apiToken.actAs(
      user.id,
      SECOND_ORGANIZATION_ID,
      ApiTokenScope.Admin
    );

    // When
    const call = RegistrationApp.registerPlatform({
      organizationId: otherOrganization.id,
      platform: buildPlatform(),
      identifier: PlatformIdentifier.Opencti,
    });

    // Then
    await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
  });

  it('should refuse unregistering a platform of an organization other than the token one', async () => {
    // Given a platform registered in the second organization from a session
    const platform = buildPlatform();
    requestContext.set(requestContextRegistererUserSecondOrga);
    await RegistrationApp.registerPlatform({
      organizationId: SECOND_ORGANIZATION_ID,
      platform,
      identifier: PlatformIdentifier.Opencti,
    });
    await TestHelper.apiToken.actAs(
      user.id,
      otherOrganization.id,
      ApiTokenScope.Admin
    );

    // When
    const call = RegistrationApp.unregisterPlatform({
      platformId: platform.id,
      identifier: PlatformIdentifier.Opencti,
    });

    // Then
    await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
  });
});
