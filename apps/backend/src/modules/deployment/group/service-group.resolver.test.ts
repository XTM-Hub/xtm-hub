import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  SERVICES,
} from '../../../../tests/tests.const';
import {
  PlatformIdentifier,
  ServiceGroupName,
  Success,
} from '../../../__generated__/resolvers-types';
import ServiceGroupModel, {
  ServiceGroupId,
} from '../../../model/kanel/public/ServiceGroup';
import { UserId } from '../../../model/kanel/public/User';
import { ErrorType } from '../../../utils/error/error.type';
import { ServiceGroupApp } from './service-group.app';
import serviceGroupResolver from './service-group.resolver';

describe('serviceGroup.users', () => {
  it('should load group users by service group id', async () => {
    // Given
    const groupId = uuidv4() as ServiceGroupId;
    const expected = [{ id: uuidv4(), email: 'user@test.com' }];
    vi.spyOn(ServiceGroupApp, 'loadGroupUsers').mockResolvedValue(
      expected as unknown as Awaited<
        ReturnType<typeof ServiceGroupApp.loadGroupUsers>
      >
    );

    // When
    const result = await serviceGroupResolver.ServiceGroup!.users!(
      { id: groupId } as unknown as ServiceGroupModel,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ServiceGroupApp.loadGroupUsers).toHaveBeenCalledWith(groupId);
    expect(result).toEqual(expected);
  });
});

describe('service groups GraphQL query', () => {
  it('should load groups for given serviceInstanceId and return result', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const expected = [{ id: uuidv4(), name: 'Group A' }] as unknown as Awaited<
      ReturnType<typeof ServiceGroupApp.loadGroups>
    >;
    vi.spyOn(ServiceGroupApp, 'loadGroups').mockResolvedValue(expected);

    // When
    const result = await serviceGroupResolver.Query!.serviceGroups!(
      {},
      { serviceInstanceId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ServiceGroupApp.loadGroups).toHaveBeenCalledWith({
      serviceInstanceId,
    });
    expect(result).toEqual(expected);
  });

  it('should throw mapped error when ServiceGroupApp throws', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    vi.spyOn(ServiceGroupApp, 'loadGroups').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = serviceGroupResolver.Query!.serviceGroups!(
      {},
      { serviceInstanceId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.UnknownError });
  });
});

describe('bundleUserServiceGroups GraphQL query', () => {
  it('should load bundle user service groups for given serviceInstanceId and return result', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const expected = [
      { user: { id: uuidv4(), email: 'user@test.com' }, groups: [] },
    ] as unknown as Awaited<
      ReturnType<typeof ServiceGroupApp.loadBundleUserServiceGroups>
    >;
    vi.spyOn(ServiceGroupApp, 'loadBundleUserServiceGroups').mockResolvedValue(
      expected
    );

    // When
    const result = await serviceGroupResolver.Query!.bundleUserServiceGroups!(
      {},
      { serviceInstanceId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ServiceGroupApp.loadBundleUserServiceGroups).toHaveBeenCalledWith(
      serviceInstanceId
    );
    expect(result).toEqual(expected);
  });

  it('should throw mapped error when ServiceGroupApp throws', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    vi.spyOn(ServiceGroupApp, 'loadBundleUserServiceGroups').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = serviceGroupResolver.Query!.bundleUserServiceGroups!(
      {},
      { serviceInstanceId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.UnknownError });
  });
});

describe('bundleProducts GraphQL query', () => {
  it('should load bundle products for given serviceInstanceId and return result', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const expected = [PlatformIdentifier.Opencti, PlatformIdentifier.Xtmone];
    vi.spyOn(ServiceGroupApp, 'loadBundleProducts').mockResolvedValue(expected);

    // When
    const result = await serviceGroupResolver.Query!.bundleProducts!(
      {},
      { serviceInstanceId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ServiceGroupApp.loadBundleProducts).toHaveBeenCalledWith(
      serviceInstanceId
    );
    expect(result).toEqual(expected);
  });

  it('should throw mapped error when ServiceGroupApp throws', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    vi.spyOn(ServiceGroupApp, 'loadBundleProducts').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = serviceGroupResolver.Query!.bundleProducts!(
      {},
      { serviceInstanceId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.UnknownError });
  });
});

describe('update service groups GraphQL mutation', () => {
  it('should delegate to ServiceGroupApp.updateGroups', async () => {
    // Given
    const groupId = uuidv4() as ServiceGroupId;
    const userId1 = uuidv4() as UserId;
    const userId2 = uuidv4() as UserId;
    const expected: Success = { success: true };
    vi.spyOn(ServiceGroupApp, 'updateGroups').mockResolvedValue(expected);

    // When
    const result = await serviceGroupResolver.Mutation!.updateServiceGroups!(
      {},
      {
        input: {
          groups: [{ id: groupId, userIds: [userId1, userId2] }],
        },
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ServiceGroupApp.updateGroups).toHaveBeenCalledWith([
      { id: groupId, userIds: [userId1, userId2] },
    ]);
    expect(result).toMatchObject({ success: true });
  });

  it('should throw mapped error when ServiceGroupApp throws', async () => {
    // Given
    const groupId = uuidv4() as ServiceGroupId;
    const userId = uuidv4();
    vi.spyOn(ServiceGroupApp, 'updateGroups').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = serviceGroupResolver.Mutation!.updateServiceGroups!(
      {},
      { input: { groups: [{ id: groupId, userIds: [userId] }] } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.UnknownError });
  });
});

describe('addUsersToBundleGroups GraphQL mutation', () => {
  it('should delegate to ServiceGroupApp.addUsersToBundleGroups', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const userId = uuidv4() as UserId;
    const input = {
      userIds: [userId],
      roles: [
        { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
      ],
    };
    const expected = [] as unknown as Awaited<
      ReturnType<typeof ServiceGroupApp.addUsersToBundleGroups>
    >;
    vi.spyOn(ServiceGroupApp, 'addUsersToBundleGroups').mockResolvedValue(
      expected
    );

    // When
    const result = await serviceGroupResolver.Mutation!.addUsersToBundleGroups!(
      {},
      { serviceInstanceId, input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ServiceGroupApp.addUsersToBundleGroups).toHaveBeenCalledWith(
      serviceInstanceId,
      input
    );
    expect(result).toEqual(expected);
  });

  it('should throw mapped error when ServiceGroupApp throws', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const input = {
      userIds: [uuidv4() as UserId],
      roles: [
        { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
      ],
    };
    vi.spyOn(ServiceGroupApp, 'addUsersToBundleGroups').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = serviceGroupResolver.Mutation!.addUsersToBundleGroups!(
      {},
      { serviceInstanceId, input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.UnknownError });
  });
});

describe('removeUsersFromBundleGroups GraphQL mutation', () => {
  it('should delegate to ServiceGroupApp.removeUsersFromBundleGroups', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const userId = uuidv4() as UserId;
    const expected = [userId] as unknown as Awaited<
      ReturnType<typeof ServiceGroupApp.removeUsersFromBundleGroups>
    >;
    vi.spyOn(ServiceGroupApp, 'removeUsersFromBundleGroups').mockResolvedValue(
      expected
    );

    // When
    const result = await serviceGroupResolver.Mutation!
      .removeUsersFromBundleGroups!(
      {},
      { serviceInstanceId, userIds: [userId] },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ServiceGroupApp.removeUsersFromBundleGroups).toHaveBeenCalledWith(
      serviceInstanceId,
      [userId]
    );
    expect(result).toEqual(expected);
  });

  it('should throw mapped error when ServiceGroupApp throws', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const userId = uuidv4() as UserId;
    vi.spyOn(ServiceGroupApp, 'removeUsersFromBundleGroups').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = serviceGroupResolver.Mutation!.removeUsersFromBundleGroups!(
      {},
      { serviceInstanceId, userIds: [userId] },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.UnknownError });
  });
});

describe('updateBundleUserGroups GraphQL mutation', () => {
  it('should delegate to ServiceGroupApp.updateBundleUserGroups', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const userId = uuidv4() as UserId;
    const input = {
      userIds: [userId],
      roles: [
        { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
      ],
    };
    const expected = [] as unknown as Awaited<
      ReturnType<typeof ServiceGroupApp.updateBundleUserGroups>
    >;
    vi.spyOn(ServiceGroupApp, 'updateBundleUserGroups').mockResolvedValue(
      expected
    );

    // When
    const result = await serviceGroupResolver.Mutation!.updateBundleUserGroups!(
      {},
      { serviceInstanceId, input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ServiceGroupApp.updateBundleUserGroups).toHaveBeenCalledWith(
      serviceInstanceId,
      input
    );
    expect(result).toEqual(expected);
  });

  it('should throw mapped error when ServiceGroupApp throws', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const input = {
      userIds: [uuidv4() as UserId],
      roles: [
        { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
      ],
    };
    vi.spyOn(ServiceGroupApp, 'updateBundleUserGroups').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = serviceGroupResolver.Mutation!.updateBundleUserGroups!(
      {},
      { serviceInstanceId, input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.UnknownError });
  });
});
