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
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  PlatformInput,
  PlatformRegistrationStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import User from '../../model/kanel/public/User';
import { ErrorCode } from '../../utils/error/error.code';
import { UserProvisioningDomain } from '../organization-management/user/user-provisioning/user-provisioning.domain';
import { UserHelper } from '../organization-management/user/user.helper';
import { RegistrationApp } from './registration.app';

const SECOND_ORGANIZATION_ID = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
const PLATFORM_TITLE = 'My OpenCTI platform';

const buildPlatform = (): PlatformInput => ({
  id: uuidv4(),
  title: PLATFORM_TITLE,
  url: 'http://example.com',
  contract: PlatformContract.Ee,
  version: '1.0.0',
});

// registerPlatform and unregisterPlatform carry @auth only: their capability check reads the database, not the
// token user. The user registers platforms in two organizations, and the admin scope keeps that capability, so a
// refusal comes from the organization the token is pinned to. The readers of a registered platform check the
// membership of the user in its organization, with the token pinned to one of the two.
describe('registration app with an API token', () => {
  let otherOrganization: Organization;
  let user: User;
  // The platforms a test registered, removed after it
  let serviceInstanceIds: ServiceInstanceId[];

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

  // A platform registered in the organization, written directly: the readers are under test, not registerPlatform
  const createPlatform = async (organizationId: OrganizationId) => {
    const serviceInstance = await TestHelper.serviceInstance.create({
      name: 'test',
    });
    serviceInstanceIds.push(serviceInstance.id);
    const { platform_id: platformId } =
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstance.id,
        platform_title: PLATFORM_TITLE,
        status: PlatformConfigurationStatus.Active,
      });
    await TestHelper.subscription.create({
      organization_id: organizationId,
      service_instance_id: serviceInstance.id,
    });
    return platformId;
  };

  const removePlatforms = async () => {
    for (const id of serviceInstanceIds) {
      await TestHelper.platformConfiguration.delete({
        service_instance_id: id,
      });
      await TestHelper.subscription.delete({ service_instance_id: id });
      await TestHelper.serviceInstance.delete({ id });
    }
  };

  beforeEach(async () => {
    serviceInstanceIds = [];
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
    await removePlatforms();
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
    const registered = await TestHelper.platformConfiguration.load({
      platform_id: platform.id,
    });
    serviceInstanceIds.push(registered!.service_instance_id);
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

  it('should refuse the organization of a platform registered in an organization other than the token one', async () => {
    // Given
    const platformId = await createPlatform(otherOrganization.id);
    await TestHelper.apiToken.actAs(
      user.id,
      SECOND_ORGANIZATION_ID,
      ApiTokenScope.Admin
    );

    // When
    const call = RegistrationApp.loadPlatformAssociatedOrganization(platformId);

    // Then
    await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
  });

  it('should return the organization of a platform registered in the token organization', async () => {
    // Given
    const platformId = await createPlatform(SECOND_ORGANIZATION_ID);
    await TestHelper.apiToken.actAs(
      user.id,
      SECOND_ORGANIZATION_ID,
      ApiTokenScope.Admin
    );

    // When
    const organization =
      await RegistrationApp.loadPlatformAssociatedOrganization(platformId);

    // Then
    expect(organization).toMatchObject({ id: SECOND_ORGANIZATION_ID });
  });

  it('should return only the status of a platform registered in an organization other than the token one', async () => {
    // Given
    const platformId = await createPlatform(otherOrganization.id);
    await TestHelper.apiToken.actAs(
      user.id,
      SECOND_ORGANIZATION_ID,
      ApiTokenScope.Admin
    );

    // When
    const response = await RegistrationApp.isPlatformRegistered({ platformId });

    // Then
    expect(response).toEqual({ status: PlatformRegistrationStatus.Registered });
  });

  it('should return the organization and the title of a platform registered in the token organization', async () => {
    // Given
    const platformId = await createPlatform(SECOND_ORGANIZATION_ID);
    await TestHelper.apiToken.actAs(
      user.id,
      SECOND_ORGANIZATION_ID,
      ApiTokenScope.Admin
    );

    // When
    const response = await RegistrationApp.isPlatformRegistered({ platformId });

    // Then
    expect(response).toEqual({
      status: PlatformRegistrationStatus.Registered,
      organization: { id: SECOND_ORGANIZATION_ID },
      platformTitle: PLATFORM_TITLE,
    });
  });
});
