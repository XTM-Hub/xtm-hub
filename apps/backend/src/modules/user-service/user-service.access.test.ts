import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  OrderingMode,
  UserServiceOrdering,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { UserServiceId } from '../../model/kanel/public/UserService';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { ErrorType } from '../../utils/error/error.type';
import { UserServiceApp } from './user-service.app';
import { UserServiceDomain } from './user-service.domain';

const buildScene = () => TestHelper.userServiceScene.create();

type Scene = Awaited<ReturnType<typeof buildScene>>;

const MANAGE_USER_SERVICES = {
  anonymous: UnauthenticatedErrorCode.Unauthenticated,
  user: 'allowed',
  admin: 'allowed',
  memberWithoutCapability: ForbiddenErrorCode.MissingCapabilityOnOrganization,
  otherOrganization: ForbiddenErrorCode.MissingCapabilityOnOrganization,
  nonMember: NotFoundErrorCode.NotFound,
  serviceManager: 'allowed',
  serviceMember: ForbiddenErrorCode.MissingCapabilityOnOrganization,
  serviceStranger: ForbiddenErrorCode.MissingCapabilityOnOrganization,
} as const;

// A token has no organization capability below the admin scope: the organization guard refuses it, and only the
// access row of its user on the service can let it in. The admin token of SECOND ORGA passes the organization guard
// but not the check that the subscription is its organization's
const ADD_USER_SERVICE_TOKENS = {
  tokenRead: ForbiddenErrorCode.ReadOnlyApiToken,
  tokenReadWrite: ForbiddenErrorCode.MissingCapabilityOnOrganization,
  tokenAdmin: NotFoundErrorCode.NotFound,
  tokenOtherOrganization: ForbiddenErrorCode.MissingCapabilityOnOrganization,
  tokenServiceManager: 'allowed',
  tokenServiceMember: ForbiddenErrorCode.MissingCapabilityOnOrganization,
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('addUserService mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: UserServiceAddInput!, $instanceId: ServiceInstanceId!) {
      addUserService(input: $input, service_instance_id: $instanceId) { id }
    }`,
    guarded: () =>
      vi.spyOn(UserServiceApp, 'addUserService').mockResolvedValue([]),
    expected: { ...MANAGE_USER_SERVICES, ...ADD_USER_SERVICE_TOKENS },
    prepare: async () => {
      const scene = await buildScene();
      return {
        variables: {
          input: {
            email: ['someone-new@filigran.io'],
            capabilities: [],
            subscription_id: scene.subscription.id,
          },
          instanceId: scene.serviceInstance.id,
        },
        expectedData: { addUserService: [] },
        cleanup: scene.cleanup,
      };
    },
  });
});

describe('editUserService mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: UserServiceEditInput!, $instanceId: ServiceInstanceId!) {
      editUserService(input: $input, service_instance_id: $instanceId) { subscription_id }
    }`,
    guarded: () => vi.spyOn(UserServiceApp, 'editUserService'),
    expected: MANAGE_USER_SERVICES,
    prepare: async () => {
      const scene = await buildScene();
      return {
        variables: {
          input: { userServiceId: scene.target.id, capabilities: ['ACCESS'] },
          instanceId: scene.serviceInstance.id,
        },
        expectedData: {
          editUserService: { subscription_id: scene.subscription.id },
        },
        cleanup: scene.cleanup,
      };
    },
  });
});

describe('deleteUserServices mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: UserServicesDeleteInput!, $instanceId: ServiceInstanceId!) {
      deleteUserServices(input: $input, service_instance_id: $instanceId) { subscription_id }
    }`,
    guarded: () => vi.spyOn(UserServiceApp, 'deleteUserServices'),
    expected: MANAGE_USER_SERVICES,
    prepare: async () => {
      const scene = await buildScene();
      return {
        variables: {
          input: { userServiceIds: [scene.target.id] },
          instanceId: scene.serviceInstance.id,
        },
        expectedData: {
          deleteUserServices: [{ subscription_id: scene.subscription.id }],
        },
        cleanup: scene.cleanup,
      };
    },
  });
});

const LIST_OPERATION = `query ($subscriptionId: SubscriptionId!) {
  userServiceFromSubscription(
    first: 10
    orderBy: ${UserServiceOrdering.Email}
    orderMode: ${OrderingMode.Asc}
    subscription_id: $subscriptionId
  ) { totalCount }
}`;

describe('userServiceFromSubscription query', () => {
  // Membership of the selected organization is enough, for a subscription of that organization
  TestHelper.expectAccessMatrix({
    operation: LIST_OPERATION,
    guarded: () => vi.spyOn(UserServiceDomain, 'loadUserServiceBySubscription'),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: 'allowed',
      admin: 'allowed',
      memberWithoutCapability: 'allowed',
      otherOrganization: NotFoundErrorCode.NotFound,
      nonMember: NotFoundErrorCode.NotFound,
      serviceManager: 'allowed',
      serviceMember: 'allowed',
      serviceStranger: 'allowed',
    },
    prepare: async () => {
      const scene = await buildScene();
      return {
        variables: { subscriptionId: scene.subscription.id },
        expectedData: { userServiceFromSubscription: { totalCount: 3 } },
        cleanup: scene.cleanup,
      };
    },
  });

  describe('when the subscription does not exist', () => {
    const executeAs = TestHelper.useGraphqlAs();
    const NOT_FOUND = [
      {
        message: NotFoundErrorCode.NotFound,
        extensions: { code: ErrorType.NotFound },
      },
    ];

    it('should refuse with NOT_FOUND when the subscription does not exist', async () => {
      // Given
      const unknownSubscriptionId = uuidv4();

      // When
      const { errors, data } = await executeAs('user', LIST_OPERATION, {
        subscriptionId: unknownSubscriptionId,
      });

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
      expect(data).toEqual({ userServiceFromSubscription: null });
    });

    it('should refuse an admin with NOT_FOUND when the subscription does not exist', async () => {
      // Given
      const unknownSubscriptionId = uuidv4();

      // When
      const { errors, data } = await executeAs('admin', LIST_OPERATION, {
        subscriptionId: unknownSubscriptionId,
      });

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
      expect(data).toEqual({ userServiceFromSubscription: null });
    });
  });
});

describe('user service mutations on the rows they name', () => {
  const executeAs = TestHelper.useGraphqlAs();
  const NOT_FOUND = [
    {
      message: NotFoundErrorCode.NotFound,
      extensions: { code: ErrorType.NotFound },
    },
  ];

  const ADD = `mutation ($input: UserServiceAddInput!, $instanceId: ServiceInstanceId!) {
    addUserService(input: $input, service_instance_id: $instanceId) { id }
  }`;
  const EDIT = `mutation ($input: UserServiceEditInput!, $instanceId: ServiceInstanceId!) {
    editUserService(input: $input, service_instance_id: $instanceId) { subscription_id }
  }`;
  const DELETE = `mutation ($input: UserServicesDeleteInput!, $instanceId: ServiceInstanceId!) {
    deleteUserServices(input: $input, service_instance_id: $instanceId) { subscription_id }
  }`;

  const edit = (
    userServiceId: UserServiceId,
    instanceId: ServiceInstanceId
  ) => ({
    input: { userServiceId, capabilities: ['ACCESS'] },
    instanceId,
  });
  const remove = (
    userServiceIds: UserServiceId[],
    instanceId: ServiceInstanceId
  ) => ({ input: { userServiceIds }, instanceId });
  const add = (
    subscriptionId: SubscriptionId,
    instanceId: ServiceInstanceId
  ) => ({
    input: {
      email: ['someone-new@filigran.io'],
      capabilities: [],
      subscription_id: subscriptionId,
    },
    instanceId,
  });

  const scenes: Scene[] = [];
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const cleanup of [
      ...cleanups.splice(0),
      ...scenes.splice(0).map((scene) => scene.cleanup),
    ]) {
      await cleanup();
    }
  });

  const givenScene = async () => {
    const scene = await buildScene();
    scenes.push(scene);
    return scene;
  };

  const givenOtherOrganizationRow = async (scene: Scene) => {
    const row = await TestHelper.userServiceScene.createOtherOrganizationRow(
      scene.serviceInstance.id
    );
    cleanups.push(row.cleanup);
    return row;
  };

  const givenOtherInstanceRow = async () => {
    const row = await TestHelper.userServiceScene.createOtherInstanceRow();
    cleanups.push(row.cleanup);
    return row;
  };

  const userServiceExists = async (id: UserServiceId) =>
    (await TestHelper.user_Service.load({ id })) !== undefined;

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'serviceManager', label: 'a service manager' },
  ] as const)(
    'should refuse $label deleting a user service of another organization on the same service instance',
    async ({ row }) => {
      // Given
      const scene = await givenScene();
      const { userService } = await givenOtherOrganizationRow(scene);

      // When
      const { errors } = await executeAs(
        row,
        DELETE,
        remove([userService.id], scene.serviceInstance.id)
      );

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
      expect(await userServiceExists(userService.id)).toBe(true);
    }
  );

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'serviceManager', label: 'a service manager' },
  ] as const)(
    'should refuse $label editing a user service of another organization on the same service instance',
    async ({ row }) => {
      // Given
      const scene = await givenScene();
      const { userService } = await givenOtherOrganizationRow(scene);
      await TestHelper.user_ServiceCapability.delete({
        user_service_id: userService.id,
      });

      // When
      const { errors } = await executeAs(
        row,
        EDIT,
        edit(userService.id, scene.serviceInstance.id)
      );

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
      expect(
        await TestHelper.user_ServiceCapability.loadAll({
          user_service_id: userService.id,
        })
      ).toEqual([]);
    }
  );

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'serviceManager', label: 'a service manager' },
  ] as const)(
    'should refuse $label adding a user to a subscription of another organization on the same service instance',
    async ({ row }) => {
      // Given
      const scene = await givenScene();
      const { subscription } = await givenOtherOrganizationRow(scene);
      const addUserService = vi.spyOn(UserServiceApp, 'addUserService');

      // When
      const { errors } = await executeAs(
        row,
        ADD,
        add(subscription.id, scene.serviceInstance.id)
      );

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
      expect(addUserService).not.toHaveBeenCalled();
    }
  );

  it('should refuse an organization manager deleting a user service of the organization that is on another service instance', async () => {
    // Given
    const scene = await givenScene();
    const { userService } = await givenOtherInstanceRow();

    // When
    const { errors } = await executeAs(
      'user',
      DELETE,
      remove([userService.id], scene.serviceInstance.id)
    );

    // Then
    expect(errors).toMatchObject(NOT_FOUND);
    expect(await userServiceExists(userService.id)).toBe(true);
  });

  it('should refuse an admin deleting a user service that is not on the service instance', async () => {
    // Given
    const scene = await givenScene();
    const { userService } = await givenOtherInstanceRow();

    // When
    const { errors } = await executeAs(
      'admin',
      DELETE,
      remove([userService.id], scene.serviceInstance.id)
    );

    // Then
    expect(errors).toMatchObject(NOT_FOUND);
    expect(await userServiceExists(userService.id)).toBe(true);
  });

  it('should refuse a service manager adding a user to a subscription on another service instance', async () => {
    // Given
    const scene = await givenScene();
    const { subscription } = await givenOtherInstanceRow();
    const addUserService = vi.spyOn(UserServiceApp, 'addUserService');

    // When
    const { errors } = await executeAs(
      'serviceManager',
      ADD,
      add(subscription.id, scene.serviceInstance.id)
    );

    // Then
    expect(errors).toMatchObject(NOT_FOUND);
    expect(addUserService).not.toHaveBeenCalled();
  });

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'serviceManager', label: 'a service manager' },
    { row: 'admin', label: 'an admin' },
  ] as const)(
    'should refuse the whole deletion by $label and delete nothing when one of the user services is foreign',
    async ({ row }) => {
      // Given
      const scene = await givenScene();
      const { userService: foreignUserService } = await givenOtherInstanceRow();

      // When
      const { errors } = await executeAs(
        row,
        DELETE,
        remove(
          [scene.target.id, foreignUserService.id],
          scene.serviceInstance.id
        )
      );

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
      expect(await userServiceExists(scene.target.id)).toBe(true);
      expect(await userServiceExists(foreignUserService.id)).toBe(true);
    }
  );

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'admin', label: 'an admin' },
  ] as const)(
    'should refuse $label deleting a user service that does not exist',
    async ({ row }) => {
      // Given
      const scene = await givenScene();

      // When
      const { errors } = await executeAs(
        row,
        DELETE,
        remove([uuidv4() as UserServiceId], scene.serviceInstance.id)
      );

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
    }
  );

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'serviceManager', label: 'a service manager' },
  ] as const)(
    'should delete the named user services of its organization for $label, each id counted once',
    async ({ row }) => {
      // Given
      const scene = await givenScene();

      // When
      const { errors, data } = await executeAs(
        row,
        DELETE,
        remove([scene.target.id, scene.target.id], scene.serviceInstance.id)
      );

      // Then
      expect(errors).toBeUndefined();
      expect(data).toMatchObject({
        deleteUserServices: [{ subscription_id: scene.subscription.id }],
      });
      expect(await userServiceExists(scene.target.id)).toBe(false);
    }
  );

  it('should answer an empty list for an empty deletion and touch nothing', async () => {
    // Given
    const scene = await givenScene();

    // When
    const { errors, data } = await executeAs(
      'user',
      DELETE,
      remove([], scene.serviceInstance.id)
    );

    // Then
    expect(errors).toBeUndefined();
    expect(data).toMatchObject({ deleteUserServices: [] });
    expect(await userServiceExists(scene.target.id)).toBe(true);
  });
});
