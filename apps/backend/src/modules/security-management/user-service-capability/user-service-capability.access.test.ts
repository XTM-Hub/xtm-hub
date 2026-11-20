import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { UserServiceId } from '../../../model/kanel/public/UserService';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { ErrorType } from '../../../utils/error/error.type';
import { UserServiceCapabilityApp } from './user-service-capability.app';

const OPERATION = `mutation ($input: UserServicesAddCapabilitiesInput!, $instanceId: ServiceInstanceId!) {
  addCapabilitiesToUserServices(input: $input, service_instance_id: $instanceId) { subscription_id }
}`;

const NOT_FOUND = [
  {
    message: NotFoundErrorCode.NotFound,
    extensions: { code: ErrorType.NotFound },
  },
];

const variables = (
  userServiceIds: UserServiceId[],
  instanceId: string
): Record<string, unknown> => ({
  input: { userServiceIds, capabilities: ['MANAGE_ACCESS'] },
  instanceId,
});

const capabilityCountOf = async (user_service_id: UserServiceId) =>
  (await TestHelper.user_ServiceCapability.loadAll({ user_service_id })).length;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('addCapabilitiesToUserServices mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: OPERATION,
    guarded: () =>
      vi.spyOn(UserServiceCapabilityApp, 'addCapabilitiesToUserServices'),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: 'allowed',
      admin: 'allowed',
      memberWithoutCapability:
        ForbiddenErrorCode.MissingCapabilityOnOrganization,
      otherOrganization: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      nonMember: NotFoundErrorCode.NotFound,
      serviceManager: 'allowed',
      serviceMember: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      serviceStranger: ForbiddenErrorCode.MissingCapabilityOnOrganization,
    },
    prepare: async () => {
      const scene = await TestHelper.userServiceScene.create();
      return {
        variables: variables([scene.target.id], scene.serviceInstance.id),
        expectedData: {
          addCapabilitiesToUserServices: [
            { subscription_id: scene.subscription.id },
          ],
        },
        cleanup: scene.cleanup,
      };
    },
  });
});

describe('addCapabilitiesToUserServices mutation on the rows it names', () => {
  const executeAs = TestHelper.useGraphqlAs();
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup();
    }
  });

  const givenScene = async () => {
    const scene = await TestHelper.userServiceScene.create();
    cleanups.push(scene.cleanup);
    return scene;
  };

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'serviceManager', label: 'a service manager' },
  ] as const)(
    'should add the capabilities to the user services of its organization for $label',
    async ({ row }) => {
      // Given
      const scene = await givenScene();

      // When
      const { errors, data } = await executeAs(
        row,
        OPERATION,
        variables([scene.target.id], scene.serviceInstance.id)
      );

      // Then
      expect(errors).toBeUndefined();
      expect(data).toMatchObject({
        addCapabilitiesToUserServices: [
          { subscription_id: scene.subscription.id },
        ],
      });
      expect(await capabilityCountOf(scene.target.id)).toBe(2);
    }
  );

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'serviceManager', label: 'a service manager' },
  ] as const)(
    'should refuse $label when a user service of another organization on the same service instance is in the list',
    async ({ row }) => {
      // Given
      const scene = await givenScene();
      const other =
        await TestHelper.userServiceScene.createOtherOrganizationRow(
          scene.serviceInstance.id
        );
      cleanups.push(other.cleanup);

      // When
      const { errors } = await executeAs(
        row,
        OPERATION,
        variables(
          [scene.target.id, other.userService.id],
          scene.serviceInstance.id
        )
      );

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
      expect(await capabilityCountOf(scene.target.id)).toBe(1);
      expect(await capabilityCountOf(other.userService.id)).toBe(1);
    }
  );

  it.each([
    { row: 'user', label: 'an organization manager' },
    { row: 'serviceManager', label: 'a service manager' },
    { row: 'admin', label: 'an admin' },
  ] as const)(
    'should refuse $label when a user service on another service instance is in the list',
    async ({ row }) => {
      // Given
      const scene = await givenScene();
      const other = await TestHelper.userServiceScene.createOtherInstanceRow();
      cleanups.push(other.cleanup);

      // When
      const { errors } = await executeAs(
        row,
        OPERATION,
        variables(
          [scene.target.id, other.userService.id],
          scene.serviceInstance.id
        )
      );

      // Then
      expect(errors).toMatchObject(NOT_FOUND);
      expect(await capabilityCountOf(scene.target.id)).toBe(1);
      expect(await capabilityCountOf(other.userService.id)).toBe(1);
    }
  );

  it('should refuse a service manager of a service instance naming a user service of another service instance', async () => {
    // Given
    const scene = await givenScene();
    const other = await TestHelper.userServiceScene.createOtherInstanceRow();
    cleanups.push(other.cleanup);

    // When
    const { errors } = await executeAs(
      'serviceManager',
      OPERATION,
      variables([other.userService.id], scene.serviceInstance.id)
    );

    // Then
    expect(errors).toMatchObject(NOT_FOUND);
    expect(await capabilityCountOf(other.userService.id)).toBe(1);
  });
});
