import { v4 as uuidv4 } from 'uuid';
import { db } from '../../knexfile';
import { ServiceInstanceId } from '../../src/model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
} from '../../src/model/kanel/public/Subscription';
import { UserId } from '../../src/model/kanel/public/User';
import UserService from '../../src/model/kanel/public/UserService';
import { GenericServiceCapabilityIds } from '../../src/modules/security-management/service-capability/generic-service-capability.const';
import { TEST_ORGANIZATIONS } from '../tests.const';
import { TestAccessMatrixHelper } from './test.access-matrix.helper';
import { TestServiceHelper } from './test.service.helper';
import { TestUserHelper } from './test.user.helper';

const { AccessId, ManageAccessId } = GenericServiceCapabilityIds;
const { serviceManager: MANAGER_USER_ID, serviceMember: MEMBER_USER_ID } =
  TestAccessMatrixHelper.serviceRowUserIds;
// A user none of the rows of the access matrix is
const TARGET_USER_ID =
  TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID;

const createSubscription = async (
  organization_id: Subscription['organization_id'],
  service_instance_id: ServiceInstanceId
): Promise<Subscription> => {
  const [subscription] = await db<Subscription>('Subscription')
    .insert({
      id: uuidv4() as SubscriptionId,
      organization_id,
      service_instance_id,
      start_date: new Date('2025-01-01'),
    })
    .returning('*');
  if (!subscription) {
    throw new Error('The subscription was not created');
  }
  return subscription;
};

const grant = (
  user_id: UserId,
  subscription_id: SubscriptionId,
  ...capabilities: GenericServiceCapabilityIds[]
): Promise<UserService> =>
  TestUserHelper.user_Service.createWithGenericCapabilities({
    user_id,
    subscription_id,
    capabilities,
  });

const deleteSubscription = async (subscription: Subscription) => {
  await TestUserHelper.user_Service.delete({
    subscription_id: subscription.id,
  });
  await db<Subscription>('Subscription').where({ id: subscription.id }).del();
};

type Cleanup = () => Promise<void>;

// Runs the cleanups in reverse order, also when a step of the setup fails, so that nothing is left behind
const withCleanup = async <T extends object>(
  build: (onCleanup: (cleanup: Cleanup) => void) => Promise<T>
): Promise<T & { cleanup: Cleanup }> => {
  const cleanups: Cleanup[] = [];
  const cleanup = async () => {
    for (const run of cleanups.splice(0).reverse()) {
      await run();
    }
  };
  try {
    return { ...(await build((run) => cleanups.push(run))), cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
};

export const TestUserServiceSceneHelper = {
  userServiceScene: {
    // A service the Filigran organization subscribes to, where the manager holds MANAGE_ACCESS, the member ACCESS
    // and the target user has a user service to edit or delete
    create: () =>
      withCleanup(async (onCleanup) => {
        const serviceInstance = await TestServiceHelper.serviceInstance.create({
          name: `user-service-scene-${uuidv4()}`,
        });
        onCleanup(() =>
          TestServiceHelper.serviceInstance.delete({ id: serviceInstance.id })
        );
        const subscription = await createSubscription(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          serviceInstance.id
        );
        onCleanup(() => deleteSubscription(subscription));
        await grant(MANAGER_USER_ID, subscription.id, ManageAccessId, AccessId);
        await grant(MEMBER_USER_ID, subscription.id, AccessId);
        const target = await grant(TARGET_USER_ID, subscription.id, AccessId);
        return { serviceInstance, subscription, target };
      }),

    // The second organization subscribes to the service instance and has a user service on it
    createOtherOrganizationRow: (instanceId: ServiceInstanceId) =>
      withCleanup(async (onCleanup) => {
        const subscription = await createSubscription(
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          instanceId
        );
        onCleanup(() => deleteSubscription(subscription));
        const userService = await grant(
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
          subscription.id,
          AccessId
        );
        return { subscription, userService };
      }),

    // The Filigran organization subscribes to another service instance and has a user service on it
    createOtherInstanceRow: () =>
      withCleanup(async (onCleanup) => {
        const serviceInstance = await TestServiceHelper.serviceInstance.create({
          name: `user-service-scene-other-${uuidv4()}`,
        });
        onCleanup(() =>
          TestServiceHelper.serviceInstance.delete({ id: serviceInstance.id })
        );
        const subscription = await createSubscription(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          serviceInstance.id
        );
        onCleanup(() => deleteSubscription(subscription));
        const userService = await grant(
          TARGET_USER_ID,
          subscription.id,
          AccessId
        );
        return { serviceInstance, subscription, userService };
      }),
  },
};
