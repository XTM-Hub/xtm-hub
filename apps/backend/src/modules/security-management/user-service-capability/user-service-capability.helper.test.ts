import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import { GenericServiceCapabilityId } from '../../../model/kanel/public/GenericServiceCapability';
import { SubscriptionId } from '../../../model/kanel/public/Subscription';
import { UserServiceId } from '../../../model/kanel/public/UserService';
import { UserServiceCapabilityId } from '../../../model/kanel/public/UserServiceCapability';
import { GenericServiceCapabilityIds } from '../service-capability/generic-service-capability.const';
import { UserServiceCapabilityHelper } from './user-service-capability.helper';

describe('insertUserServiceCapability', () => {
  let subscriptionId: SubscriptionId | undefined;
  let userServiceId: UserServiceId | undefined;

  beforeEach(async () => {
    const subscription = await TestHelper.subscription.create({
      organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      start_date: new Date(),
    });
    subscriptionId = subscription.id;

    const userService = await TestHelper.user_Service.create({
      user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
      subscription_id: subscriptionId,
    });
    userServiceId = userService?.id;
  });

  afterEach(async () => {
    if (userServiceId) {
      await TestHelper.user_ServiceCapability.delete({
        user_service_id: userServiceId,
      });
      await TestHelper.user_Service.delete({ id: userServiceId });
    }

    if (subscriptionId) {
      await TestHelper.subscription.delete({ id: subscriptionId });
    }
  });

  it('should not insert a duplicate row when the same business key already exists with null values', async () => {
    expect(userServiceId).toBeDefined();

    const existingId = uuidv4() as UserServiceCapabilityId;
    const duplicatedCandidateId = uuidv4() as UserServiceCapabilityId;
    const genericCapabilityId =
      GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId;

    await TestHelper.user_ServiceCapability.create({
      id: existingId,
      user_service_id: userServiceId,
      generic_service_capability_id: genericCapabilityId,
      subscription_capability_id: null,
    });

    await UserServiceCapabilityHelper.insertUserServiceCapability([
      {
        id: duplicatedCandidateId,
        user_service_id: userServiceId,
        generic_service_capability_id: genericCapabilityId,
        subscription_capability_id: null,
      },
    ]);

    const persistedRows = await TestHelper.user_ServiceCapability.loadAll({
      user_service_id: userServiceId,
    });

    expect(persistedRows).toHaveLength(1);
    expect(persistedRows[0]).toMatchObject({
      id: existingId,
      user_service_id: userServiceId,
      generic_service_capability_id: genericCapabilityId,
      subscription_capability_id: null,
    });
    expect(persistedRows.some((row) => row.id === duplicatedCandidateId)).toBe(
      false
    );
  });
});

describe('loadCapabilitiesByKeys', () => {
  let subscriptionId: SubscriptionId | undefined;
  let userServiceId: UserServiceId | undefined;

  beforeEach(async () => {
    const subscription = await TestHelper.subscription.create({
      organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      start_date: new Date(),
    });
    subscriptionId = subscription.id;

    const userService = await TestHelper.user_Service.create({
      user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
      subscription_id: subscriptionId,
    });
    userServiceId = userService?.id;

    await TestHelper.user_ServiceCapability.create({
      id: uuidv4() as UserServiceCapabilityId,
      user_service_id: userServiceId,
      generic_service_capability_id:
        GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId,
      subscription_capability_id: null,
    });
  });

  afterEach(async () => {
    if (userServiceId) {
      await TestHelper.user_ServiceCapability.delete({
        user_service_id: userServiceId,
      });
      await TestHelper.user_Service.delete({ id: userServiceId });
    }

    if (subscriptionId) {
      await TestHelper.subscription.delete({ id: subscriptionId });
    }
  });

  it('should return capabilities matching each key and default to an empty array for missing keys, preserving input order', async () => {
    const results = await UserServiceCapabilityHelper.loadCapabilitiesByKeys([
      {
        serviceInstanceId: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      },
      {
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      },
    ]);

    expect(results).toEqual([[], ['MANAGE_ACCESS']]);
  });

  it('should not match a key built from the cross product of the requested keys', async () => {
    const results = await UserServiceCapabilityHelper.loadCapabilitiesByKeys([
      {
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
      },
      {
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      },
    ]);

    expect(results).toEqual([[], []]);
  });

  it('should return an empty array when no key is provided', async () => {
    const results = await UserServiceCapabilityHelper.loadCapabilitiesByKeys(
      []
    );

    expect(results).toEqual([]);
  });
});
