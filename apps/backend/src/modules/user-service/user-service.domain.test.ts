import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../../knexfile';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  SERVICES,
  TEST_ORGANIZATIONS,
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
} from '../../../tests/tests.const';
import { ServiceRestriction } from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { GenericServiceCapabilityId } from '../../model/kanel/public/GenericServiceCapability';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { UserId } from '../../model/kanel/public/User';
import UserService, {
  UserServiceId,
} from '../../model/kanel/public/UserService';
import UserServiceCapability, {
  UserServiceCapabilityId,
} from '../../model/kanel/public/UserServiceCapability';
import * as mailService from '../../server/mail-service';
import { ForbiddenErrorCode } from '../../utils/error/error.code';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { UserHelper } from '../organization-management/user/user.helper';
import { GenericServiceCapabilityIds } from '../security-management/service-capability/generic-service-capability.const';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { UserServiceDomain } from './user-service.domain';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIMPLE = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE;
const ADMIN = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA;
const SECOND_ORG_ID = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;

// ---------------------------------------------------------------------------
// Shared DB helpers
// ---------------------------------------------------------------------------

const cleanupUserServices = async (subscriptionId: SubscriptionId) => {
  const userServices = await TestHelper.user_Service.loadAll({
    subscription_id: subscriptionId,
  });

  if (userServices.length > 0) {
    // eslint-disable-next-line no-restricted-syntax
    await db<UserServiceCapability>('UserService_Capability')
      .whereIn(
        'user_service_id',
        userServices?.map((us) => us.id)
      )
      .delete();
  }

  await TestHelper.user_Service.delete({ subscription_id: subscriptionId });
};

const makeSubscription = (overrides?: {
  id?: SubscriptionId;
  service_instance_id?: ServiceInstanceId;
  organization_id?: OrganizationId;
  start_date?: Date;
  end_date?: Date | null;
  status?: string;
}) => ({
  id: (overrides?.id ?? uuidv4()) as SubscriptionId,
  service_instance_id:
    overrides?.service_instance_id ?? SERVICES.INSTANCES.VAULT.ID,
  organization_id: overrides?.organization_id ?? SECOND_ORG_ID,
  start_date: overrides?.start_date ?? new Date(),
  end_date: overrides?.end_date !== undefined ? overrides.end_date : undefined,
});

/** Creates a subscription and returns its id. */
const createTestSubscription = async (
  overrides?: Parameters<typeof makeSubscription>[0]
) => {
  const data = makeSubscription(overrides);
  await SubscriptionDomain.createSubscription(data);
  return data.id;
};

/** Inserts a bare User_Service row and returns its id. */
const insertUserService = async (
  userId: UserId,
  subId: SubscriptionId
): Promise<UserServiceId> => {
  const id = uuidv4() as UserServiceId;
  await TestHelper.user_Service.create({
    id,
    user_id: userId,
    subscription_id: subId,
  });
  return id;
};

/** Inserts a User_Service row plus one ACCESS capability row. */
const insertUserServiceWithCapability = async (
  userId: UserId,
  subId: SubscriptionId
): Promise<{ userServiceId: UserServiceId; capabilityId: string }> => {
  const userServiceId = await insertUserService(userId, subId);
  const capabilityId = uuidv4();
  await TestHelper.user_ServiceCapability.create({
    id: capabilityId as UserServiceCapabilityId,
    user_service_id: userServiceId,
    generic_service_capability_id:
      GenericServiceCapabilityIds.AccessId as GenericServiceCapabilityId,
  });
  return { userServiceId, capabilityId };
};

// ---------------------------------------------------------------------------
// Shared lifecycle helpers for describe blocks that own one subscription
// ---------------------------------------------------------------------------

/**
 * Creates a fresh ACCEPTED subscription before each test and tears it down
 * (plus all its User_Service rows) after each test.
 * Returns a ref object so the `subscriptionId` is always current.
 */
const useSubscription = () => {
  const ref = { id: '' as SubscriptionId };

  beforeEach(async () => {
    ref.id = await createTestSubscription({
      start_date: new Date(),
      end_date: undefined,
    });
  });

  afterEach(async () => {
    await cleanupUserServices(ref.id);
    await TestHelper.subscription.delete({ id: ref.id });
  });

  return ref;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('userServiceDomain', () => {
  describe('addServiceToUsers', () => {
    const sub = useSubscription();

    beforeEach(() => {
      vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);
    });

    const getSubscription = async () => {
      const allSubscriptions = await TestHelper.subscription.loadAll({
        id: sub.id,
      });
      return allSubscriptions[0];
    };
    const addSimpleUser = async (
      capabilities = [ServiceRestriction.Access]
    ) => {
      const subscription = await getSubscription();
      return UserServiceDomain.addServiceToUsers(
        subscription!,
        [SIMPLE.EMAIL],
        capabilities
      );
    };

    it('should create a UserService for an existing org user', async () => {
      const result = await addSimpleUser();

      expect(result).toHaveLength(1);
      expect(result).toMatchObject([
        {
          subscription_id: sub.id,
          user_id: SIMPLE.ID,
        },
      ]);

      const persisted = await TestHelper.user_Service.load({
        id: result[0]!.id,
      });
      expect(persisted).toMatchObject({
        subscription_id: sub.id,
      });
    });

    it('should add the ACCESS capability even when capabilities array is empty', async () => {
      const subscription = await getSubscription();
      const result = await UserServiceDomain.addServiceToUsers(
        subscription!,
        [SIMPLE.EMAIL],
        []
      );

      expect(result).toHaveLength(1);

      const capabilities: { generic_id: string }[] =
        // eslint-disable-next-line no-restricted-syntax
        await db<UserServiceCapability>('UserService_Capability')
          .where('user_service_id', result[0]!.id)
          .leftJoin(
            'Generic_Service_Capability',
            'UserService_Capability.generic_service_capability_id',
            '=',
            'Generic_Service_Capability.id'
          )
          .select('Generic_Service_Capability.id as generic_id');

      expect(
        capabilities.some(
          (c) => c.generic_id === GenericServiceCapabilityIds.AccessId
        )
      ).toBe(true);
    });

    it('should create UserService records for multiple users in one call', async () => {
      const subscription = await getSubscription();
      const result = await UserServiceDomain.addServiceToUsers(
        subscription!,
        [SIMPLE.EMAIL, ADMIN.EMAIL],
        [ServiceRestriction.Access]
      );

      expect(result).toHaveLength(2);

      // eslint-disable-next-line no-restricted-syntax
      const persisted = await db<UserService[]>('User_Service')
        .whereIn(
          'id',
          result.map((us) => us.id)
        )
        .select('*');

      expect(persisted).toHaveLength(2);
      expect(persisted.every((us) => us.subscription_id === sub.id)).toBe(true);
    });

    it('should return an empty array and create no DB records when emails list is empty', async () => {
      const subscription = await getSubscription();
      const result = await UserServiceDomain.addServiceToUsers(
        subscription!,
        [],
        [ServiceRestriction.Access]
      );

      expect(result).toEqual([]);

      const rows = await TestHelper.user_Service.loadAll({
        subscription_id: sub.id,
      });
      expect(rows).toHaveLength(0);
    });

    it('should skip users that already have a UserService for the subscription', async () => {
      await addSimpleUser();
      const secondResult = await addSimpleUser();

      expect(secondResult).toHaveLength(0);

      const rows = await TestHelper.user_Service.loadAll({
        subscription_id: sub.id,
      });
      expect(rows).toHaveLength(1);
    });

    it('should only return newly created records when some users already have access', async () => {
      const subscription = await getSubscription();
      await UserServiceDomain.addServiceToUsers(
        subscription!,
        [SIMPLE.EMAIL],
        [ServiceRestriction.Access]
      );

      const result = await UserServiceDomain.addServiceToUsers(
        subscription!,
        [SIMPLE.EMAIL, ADMIN.EMAIL],
        [ServiceRestriction.Access]
      );

      expect(result).toHaveLength(1);
      const user2 = await UserDomain.loadUserBy({ email: ADMIN.EMAIL });
      expect(result[0]!.user_id).toBe(user2!.id);
    });

    it('should create a new User record for an unknown email in the org domain', async () => {
      requestContext.set(requestContextAdminSecondOrga);

      const newEmail = `new-user-${uuidv4()}@${TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST.NAME}`;
      const subscription = await getSubscription();

      const result = await UserServiceDomain.addServiceToUsers(
        subscription!,
        [newEmail],
        [ServiceRestriction.Access]
      );

      expect(result).toHaveLength(1);

      const createdUser = await UserDomain.loadUserBy({ email: newEmail });
      expect(createdUser).toBeDefined();
      expect(createdUser!.email).toBe(newEmail);
      expect(result[0]!.user_id).toBe(createdUser!.id);

      await cleanupUserServices(sub.id);
      await UserHelper.removeUser({ email: newEmail });
    });

    it('should reuse an existing user when the email is already in the DB', async () => {
      const result = await addSimpleUser();

      expect(result).toHaveLength(1);
      expect(result[0]!.user_id).toBe(SIMPLE.ID);

      const usersWithEmail = await TestHelper.user.loadAll({
        email: SIMPLE.EMAIL,
      });
      expect(usersWithEmail).toHaveLength(1);
    });

    it('should persist UserService_Capability rows including ACCESS', async () => {
      const result = await addSimpleUser();

      const capabilities = await TestHelper.user_ServiceCapability.loadAll({
        user_service_id: result[0]!.id,
      });

      expect(capabilities.length).toBeGreaterThan(0);
      expect(
        capabilities.some(
          (c) =>
            c.generic_service_capability_id ===
            GenericServiceCapabilityIds.AccessId
        )
      ).toBe(true);
    });

    it('should persist MANAGE_ACCESS capability when requested', async () => {
      const result = await addSimpleUser([ServiceRestriction.ManageAccess]);

      const capabilities = await TestHelper.user_ServiceCapability.loadAll({
        user_service_id: result[0]!.id,
      });

      expect(
        capabilities.some(
          (c) =>
            c.generic_service_capability_id ===
            GenericServiceCapabilityIds.ManageAccessId
        )
      ).toBe(true);
    });

    it('should throw a ForbiddenAccess error when an email domain does not match the org', async () => {
      const outsiderEmail = `outsider-${uuidv4()}@filigran.io`;
      const subscription = await getSubscription();

      const call = UserServiceDomain.addServiceToUsers(
        subscription!,
        [outsiderEmail],
        [ServiceRestriction.Access]
      );
      await expect(call).rejects.toThrow(
        ForbiddenErrorCode.EmailOutsideOrganizationError
      );

      const rows = await TestHelper.user_Service.loadAll({
        subscription_id: sub.id,
      });
      expect(rows).toHaveLength(0);
    });

    it('should call sendMail once per newly created UserService', async () => {
      const subscription = await getSubscription();
      await UserServiceDomain.addServiceToUsers(
        subscription!,
        [SIMPLE.EMAIL, ADMIN.EMAIL],
        [ServiceRestriction.Access]
      );

      expect(mailService.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should not call sendMail when the user already has access', async () => {
      await addSimpleUser();

      vi.clearAllMocks();
      vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);

      await addSimpleUser();

      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it('should return UserService objects with the correct shape', async () => {
      const result = await addSimpleUser();

      expect(result).toMatchObject([
        {
          id: expect.any(String),
          user_id: SIMPLE.ID,
          subscription_id: sub.id,
        },
      ]);
    });

    it('should handle duplicate emails in the same call gracefully', async () => {
      const subscription = await getSubscription();
      const result = await UserServiceDomain.addServiceToUsers(
        subscription!,
        [SIMPLE.EMAIL, SIMPLE.EMAIL],
        [ServiceRestriction.Access]
      );

      expect(result).toHaveLength(1);

      const rows = await TestHelper.user_Service.loadAll({
        subscription_id: sub.id,
      });
      expect(rows).toHaveLength(1);
    });
  });

  describe('deleteUserService', () => {
    const sub = useSubscription();

    it('should delete the matching User_Service row and return it', async () => {
      const userServiceId = await insertUserService(SIMPLE.ID, sub.id);

      const result = await UserServiceDomain.deleteUserServices([
        userServiceId,
      ]);

      expect(result).toHaveLength(1);
      expect(result).toMatchObject([
        {
          id: userServiceId,
          user_id: SIMPLE.ID,
          subscription_id: sub.id,
        },
      ]);

      const remaining = await TestHelper.user_Service.load({
        id: userServiceId,
      });
      expect(remaining).toBeUndefined();
    });

    it('should cascade-delete all UserService_Capability rows when the parent is deleted', async () => {
      const { userServiceId, capabilityId } =
        await insertUserServiceWithCapability(SIMPLE.ID, sub.id);

      const before = await TestHelper.user_ServiceCapability.load({
        id: capabilityId as UserServiceCapabilityId,
      });
      expect(before).toBeDefined();

      await UserServiceDomain.deleteUserServices([userServiceId]);

      const deletedService = await TestHelper.user_Service.load({
        id: userServiceId,
      });
      expect(deletedService).toBeUndefined();

      const deletedCapability = await TestHelper.user_ServiceCapability.load({
        id: capabilityId as UserServiceCapabilityId,
      });
      expect(deletedCapability).toBeUndefined();
    });

    it('should cascade-delete multiple UserService_Capability rows for the same User_Service', async () => {
      const userServiceId = await insertUserService(SIMPLE.ID, sub.id);

      const cap1Id = uuidv4();
      const cap2Id = uuidv4();
      await TestHelper.user_ServiceCapability.create({
        id: cap1Id as UserServiceCapabilityId,
        user_service_id: userServiceId,
        generic_service_capability_id:
          GenericServiceCapabilityIds.AccessId as GenericServiceCapabilityId,
      });
      await TestHelper.user_ServiceCapability.create({
        id: cap2Id as UserServiceCapabilityId,
        user_service_id: userServiceId,
        generic_service_capability_id:
          GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId,
      });

      await UserServiceDomain.deleteUserServices([userServiceId]);

      // eslint-disable-next-line no-restricted-syntax
      const survivors = await db<UserServiceCapability>(
        'UserService_Capability'
      )
        .whereIn('id', [cap1Id, cap2Id])
        .select('id');
      expect(survivors).toHaveLength(0);
    });

    it('should return an empty array and delete nothing when the id is non-existent', async () => {
      const ghostId = uuidv4() as UserServiceId;

      const result = await UserServiceDomain.deleteUserServices([ghostId]);

      expect(result).toEqual([]);
    });

    it('should only delete the targeted row when multiple users share the same subscription', async () => {
      const userServiceId = await insertUserService(SIMPLE.ID, sub.id);
      const adminServiceId = await insertUserService(ADMIN.ID, sub.id);

      await UserServiceDomain.deleteUserServices([userServiceId]);

      const adminService = await TestHelper.user_Service.load({
        id: adminServiceId,
      });
      expect(adminService).toBeDefined();
      expect(adminService!.user_id).toBe(ADMIN.ID);

      const remaining = await TestHelper.user_Service.loadAll({
        subscription_id: sub.id,
      });
      expect(remaining).toHaveLength(1);
    });

    it('should not delete rows belonging to a different subscription for the same user', async () => {
      const secondSubId = await createTestSubscription({
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        start_date: new Date(),
        end_date: undefined,
      });

      const userServiceId = await insertUserService(SIMPLE.ID, sub.id);
      const secondServiceId = await insertUserService(SIMPLE.ID, secondSubId);

      await UserServiceDomain.deleteUserServices([userServiceId]);

      const secondService = await TestHelper.user_Service.load({
        id: secondServiceId,
      });
      expect(secondService).toMatchObject({
        subscription_id: secondSubId,
      });

      await cleanupUserServices(secondSubId);
      await TestHelper.subscription.delete({ id: secondSubId });
    });

    it('should be idempotent — second call returns empty array without throwing', async () => {
      const userServiceId = await insertUserService(SIMPLE.ID, sub.id);

      const first = await UserServiceDomain.deleteUserServices([userServiceId]);
      expect(first).toHaveLength(1);

      const second = await UserServiceDomain.deleteUserServices([
        userServiceId,
      ]);
      expect(second).toEqual([]);
    });

    it('should return an object matching the UserService shape', async () => {
      const userServiceId = await insertUserService(SIMPLE.ID, sub.id);

      const result = await UserServiceDomain.deleteUserServices([
        userServiceId,
      ]);

      expect(result).toMatchObject([
        {
          id: userServiceId,
          user_id: SIMPLE.ID,
          subscription_id: sub.id,
        },
      ]);
      expect(
        Object.prototype.hasOwnProperty.call(
          result?.[0],
          'service_personal_data'
        )
      ).toBe(true);
    });
  });

  describe('loadUserServiceBySubscription', () => {
    const defaultOpts = {
      first: 50,
      orderBy: 'User_Service.id',
      orderMode: 'asc',
    };

    const secondOrgaSub = useSubscription();
    let filigranSubId: SubscriptionId;

    beforeEach(async () => {
      filigranSubId = await createTestSubscription({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.VAULT.ID,
        start_date: new Date(),
        end_date: undefined,
      });
      await insertUserService(SIMPLE.ID, secondOrgaSub.id);
      await insertUserService(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        filigranSubId
      );
    });

    afterEach(async () => {
      await cleanupUserServices(filigranSubId);
      await TestHelper.subscription.delete({ id: filigranSubId });
    });

    it('should return only users from the selected organization', async () => {
      requestContext.set(requestContextAdminSecondOrga);

      const result = await UserServiceDomain.loadUserServiceBySubscription(
        defaultOpts,
        secondOrgaSub.id
      );

      const returnedUserIds = result.edges.map((e) => e.node!.user_id);
      expect(returnedUserIds).toContain(SIMPLE.ID);
      expect(returnedUserIds).not.toContain(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID
      );
    });

    it('should not return users from the selected organization subscription when querying from another organization', async () => {
      requestContext.set(requestContextAdminSecondOrga);

      const result = await UserServiceDomain.loadUserServiceBySubscription(
        defaultOpts,
        filigranSubId
      );

      expect(result.edges).toHaveLength(0);
    });

    it('should return users from any organization for filigran admin', async () => {
      requestContext.set({
        ...requestContextAdminUser,
        user: {
          ...requestContextAdminUser.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      });

      const result = await UserServiceDomain.loadUserServiceBySubscription(
        defaultOpts,
        filigranSubId
      );

      const returnedUserIds = result.edges.map((e) => e.node!.user_id);
      expect(returnedUserIds).toContain(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID
      );
    });
  });

  describe('doesUserServiceExist', () => {
    const sub = useSubscription();

    it('should return true when the user already has access to the subscription', async () => {
      await insertUserService(SIMPLE.ID, sub.id);

      const result = await UserServiceDomain.doesUserServiceExist(
        SIMPLE.ID,
        sub.id
      );

      expect(result).toBe(true);
    });

    it('should return false when the user has no access to the subscription', async () => {
      const result = await UserServiceDomain.doesUserServiceExist(
        SIMPLE.ID,
        sub.id
      );

      expect(result).toBe(false);
    });

    it('should not match a user service belonging to another subscription', async () => {
      const otherSubscriptionId = await createTestSubscription({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.VAULT.ID,
        start_date: new Date(),
        end_date: undefined,
      });
      await insertUserService(SIMPLE.ID, otherSubscriptionId);

      const result = await UserServiceDomain.doesUserServiceExist(
        SIMPLE.ID,
        sub.id
      );

      await cleanupUserServices(otherSubscriptionId);
      await TestHelper.subscription.delete({ id: otherSubscriptionId });

      expect(result).toBe(false);
    });
  });
});
