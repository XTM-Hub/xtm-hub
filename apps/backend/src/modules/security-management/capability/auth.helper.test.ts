import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { CAPABILITY_BYPASS } from '../../../portal.const';

import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { GenericServiceCapabilityIds } from '../service-capability/generic-service-capability.const';
import { AuthHelper } from './auth.helper';

describe('authHelper', () => {
  describe('isUserAllowed', () => {
    it('should allow user if he has bypass capability', async () => {
      const result = AuthHelper.isUserAllowed({
        userCapabilities: [CAPABILITY_BYPASS],
        organizationCapabilities: [],
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      expect(result).toBeTruthy();
    });

    it('should allow user if he has the required capability', async () => {
      const result = AuthHelper.isUserAllowed({
        userCapabilities: [],
        organizationCapabilities: [
          OrganizationCapability.ManagePlatformRegistration,
        ],
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      expect(result).toBeTruthy();
    });

    it('should allow user if he has the administrate organization capability', async () => {
      const result = AuthHelper.isUserAllowed({
        userCapabilities: [],
        organizationCapabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      expect(result).toBeTruthy();
    });

    it('should not allow user if he does not have the required capabilities', async () => {
      const result = AuthHelper.isUserAllowed({
        userCapabilities: [],
        organizationCapabilities: [],
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      expect(result).toBeFalsy();
    });
  });
});

describe('authHelper.loadCapabilitiesByServiceId', () => {
  const { AccessId, ManageAccessId } = GenericServiceCapabilityIds;
  const MANAGER = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID;
  const MEMBER = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID;
  const STRANGER = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID;
  const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN.ID;
  const SECOND_ORGANIZATION = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;

  const cleanups: (() => Promise<void>)[] = [];

  // Last registered first: a row goes before what it points to
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup();
    }
  });

  // The Filigran organization subscribes to a new instance: the manager holds MANAGE_ACCESS and ACCESS on it,
  // the member has an access row without any capability row
  const givenInstanceWithAccessRows = async () => {
    const instance = await TestHelper.serviceInstance.create({
      name: `auth-helper-${uuidv4()}`,
    });
    cleanups.push(() => TestHelper.serviceInstance.delete({ id: instance.id }));
    const subscription = await TestHelper.subscription.create({
      organization_id: FILIGRAN,
      service_instance_id: instance.id,
      start_date: new Date('2025-01-01'),
    });
    cleanups.push(() =>
      TestHelper.subscription.delete({ id: subscription.id })
    );
    for (const [user_id, capabilities] of [
      [MANAGER, [ManageAccessId, AccessId]],
      [MEMBER, []],
    ] as const) {
      const userService =
        await TestHelper.user_Service.createWithGenericCapabilities({
          user_id,
          subscription_id: subscription.id,
          capabilities: [...capabilities],
        });
      cleanups.push(() =>
        TestHelper.user_Service.delete({ id: userService.id })
      );
    }
    return instance.id;
  };

  it('should return the capabilities of a user with an access row on the instance', async () => {
    // Given
    const instanceId = await givenInstanceWithAccessRows();

    // When
    const result = await AuthHelper.loadCapabilitiesByServiceId(
      { id: MANAGER, selected_organization_id: FILIGRAN },
      instanceId
    );

    // Then
    expect(result?.is_member).toBe(true);
    expect([...(result?.capabilities ?? [])].sort()).toEqual([
      'ACCESS',
      'MANAGE_ACCESS',
    ]);
  });

  it('should return a member without any capability row, without capabilities', async () => {
    // Given
    const instanceId = await givenInstanceWithAccessRows();

    // When
    const result = await AuthHelper.loadCapabilitiesByServiceId(
      { id: MEMBER, selected_organization_id: FILIGRAN },
      instanceId
    );

    // Then
    expect(result).toMatchObject({ capabilities: null, is_member: true });
  });

  it('should return a user with no access row on the instance as not a member', async () => {
    // Given
    const instanceId = await givenInstanceWithAccessRows();

    // When
    const result = await AuthHelper.loadCapabilitiesByServiceId(
      { id: STRANGER, selected_organization_id: FILIGRAN },
      instanceId
    );

    // Then
    expect(result).toMatchObject({ capabilities: null, is_member: false });
  });

  it('should return a user as not a member when the selected organization has no subscription to the instance', async () => {
    // Given
    const instanceId = await givenInstanceWithAccessRows();

    // When
    const result = await AuthHelper.loadCapabilitiesByServiceId(
      { id: MANAGER, selected_organization_id: SECOND_ORGANIZATION },
      instanceId
    );

    // Then
    expect(result).toMatchObject({ capabilities: null, is_member: false });
  });

  it('should return nothing for an unknown instance', async () => {
    // When
    const result = await AuthHelper.loadCapabilitiesByServiceId(
      { id: MANAGER, selected_organization_id: FILIGRAN },
      uuidv4() as ServiceInstanceId
    );

    // Then
    expect(result).toBeUndefined();
  });
});
