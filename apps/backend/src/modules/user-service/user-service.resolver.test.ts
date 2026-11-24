import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextSimpleUserFiligran2,
  contextSimpleUserSecondOrga,
  GRAPHQL_RESOLVE_INFO,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  OrderingMode,
  PageInfo,
  SubscriptionModel,
  UserService,
  UserServiceConnection,
  UserServiceEdge,
  UserServiceOrdering,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { UserServiceId } from '../../model/kanel/public/UserService';
import { UserWithOrganizationsAndRole } from '../../model/user';
import { OwnershipDomain } from '../../security/guarded/ownership.domain';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { ErrorType } from '../../utils/error/error.type';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { UserServiceApp } from './user-service.app';
import { UserServiceDomain } from './user-service.domain';
import userServiceResolver from './user-service.resolver';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('userService field resolvers', () => {
  describe('userService.user', () => {
    it('should load user details by user_id', async () => {
      // Given
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;
      const expected = { id: userId, email: 'user@test.com' };
      vi.spyOn(UserDomain, 'loadUserDetails').mockResolvedValue(
        expected as unknown as UserWithOrganizationsAndRole
      );

      // When
      const result = await userServiceResolver.UserService!.user!(
        { user_id: userId } as unknown as UserService,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(UserDomain.loadUserDetails).toHaveBeenCalledWith({
        'User.id': userId,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('userService.subscription', () => {
    it('should load subscription by user service id', async () => {
      // Given
      const userServiceId = uuidv4() as UserServiceId;
      const expected = { id: uuidv4() } as unknown as SubscriptionModel;
      vi.spyOn(
        UserServiceDomain,
        'loadSubscriptionByUserService'
      ).mockResolvedValue(expected);

      // When
      const result = await userServiceResolver.UserService!.subscription!(
        { id: userServiceId } as unknown as UserService,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(
        UserServiceDomain.loadSubscriptionByUserService
      ).toHaveBeenCalledWith(userServiceId);
      expect(result).toEqual(expected);
    });
  });

  describe('userService.user_service_capability', () => {
    it('should load user service capabilities by user service id', async () => {
      // Given
      const userServiceId = uuidv4() as UserServiceId;
      const expected = [{ id: uuidv4() }];
      vi.spyOn(
        UserServiceDomain,
        'loadUserServiceCapabilities'
      ).mockResolvedValue(
        expected as unknown as Awaited<
          ReturnType<typeof UserServiceDomain.loadUserServiceCapabilities>
        >
      );

      // When
      const result = await userServiceResolver.UserService!
        .user_service_capability!(
        { id: userServiceId } as unknown as UserService,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(
        UserServiceDomain.loadUserServiceCapabilities
      ).toHaveBeenCalledWith(userServiceId);
      expect(result).toEqual(expected);
    });
  });
});

describe('user service from subscription GraphQL query', () => {
  const subscriptionId = uuidv4() as SubscriptionId;
  const paginationArgs = {
    first: 10,
    after: null,
    orderMode: OrderingMode.Asc,
    orderBy: UserServiceOrdering.Email,
  };
  const buildConnection = (): UserServiceConnection => {
    const userServiceId = uuidv4() as UserServiceId;
    const userService: UserService = {
      id: userServiceId,
      subscription_id: subscriptionId,
      user_id: uuidv4(),
    };
    const edge: UserServiceEdge = {
      cursor: userServiceId,
      node: userService,
    };
    const pageInfo: PageInfo = {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: userServiceId,
      endCursor: userServiceId,
    };
    return { edges: [edge], pageInfo, totalCount: 1 };
  };

  it('should check the subscription in the selected organization and delegate to UserServiceDomain for a member', async () => {
    // Given
    const expected = buildConnection();
    const countRows = vi
      .spyOn(OwnershipDomain, 'countOwnedRows')
      .mockResolvedValue(1);
    vi.spyOn(
      UserServiceDomain,
      'loadUserServiceBySubscription'
    ).mockReturnValue(expected as unknown as Promise<UserServiceConnection>);

    // When
    const result = await userServiceResolver.Query!
      .userServiceFromSubscription!(
      {},
      { ...paginationArgs, subscription_id: subscriptionId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(countRows).toHaveBeenCalledExactlyOnceWith(
      'Subscription',
      [subscriptionId],
      {
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        serviceInstanceId: undefined,
      }
    );
    expect(
      UserServiceDomain.loadUserServiceBySubscription
    ).toHaveBeenCalledWith(paginationArgs, subscriptionId);
    expect(result).toEqual(expected);
  });

  it('should check that the subscription exists and delegate to UserServiceDomain for an admin', async () => {
    // Given
    const expected = buildConnection();
    const countRows = vi
      .spyOn(OwnershipDomain, 'countOwnedRows')
      .mockResolvedValue(1);
    vi.spyOn(
      UserServiceDomain,
      'loadUserServiceBySubscription'
    ).mockReturnValue(expected as unknown as Promise<UserServiceConnection>);

    // When
    const result = await userServiceResolver.Query!
      .userServiceFromSubscription!(
      {},
      { ...paginationArgs, subscription_id: subscriptionId },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(countRows).toHaveBeenCalledExactlyOnceWith(
      'Subscription',
      [subscriptionId],
      { organizationId: undefined, serviceInstanceId: undefined }
    );
    expect(result).toEqual(expected);
  });

  it.each([
    {
      label: 'a member of the selected organization',
      context: contextSimpleUserSecondOrga,
    },
    { label: 'an admin', context: contextBypassUser },
  ])(
    'should refuse $label with NOT_FOUND when the subscription is not in scope',
    async ({ context }) => {
      // Given
      vi.spyOn(OwnershipDomain, 'countOwnedRows').mockResolvedValue(0);
      const load = vi.spyOn(UserServiceDomain, 'loadUserServiceBySubscription');

      // When
      const call = userServiceResolver.Query!.userServiceFromSubscription!(
        {},
        { ...paginationArgs, subscription_id: subscriptionId },
        context,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      await expect(call).rejects.toMatchObject({ name: ErrorType.NotFound });
      expect(load).not.toHaveBeenCalled();
    }
  );
});

describe('add user service GraphQL mutation', () => {
  it('should check the subscription on the service instance and delegate to UserServiceApp', async () => {
    // Given
    const subscriptionId = uuidv4() as SubscriptionId;
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const input = {
      email: ['user@test.com'],
      capabilities: ['MANAGE_ACCESS'],
      subscription_id: subscriptionId,
    };
    const expected = [] as unknown as Awaited<
      ReturnType<typeof UserServiceApp.addUserService>
    >;
    const countRows = vi
      .spyOn(OwnershipDomain, 'countOwnedRows')
      .mockResolvedValue(1);
    vi.spyOn(UserServiceApp, 'addUserService').mockResolvedValue(expected);

    // When
    const result = await userServiceResolver.Mutation!.addUserService!(
      {},
      { input, service_instance_id: serviceInstanceId },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(countRows).toHaveBeenCalledExactlyOnceWith(
      'Subscription',
      [subscriptionId],
      { organizationId: undefined, serviceInstanceId }
    );
    expect(UserServiceApp.addUserService).toHaveBeenCalledWith(
      contextBypassUser.user,
      subscriptionId,
      input.email,
      input.capabilities
    );
    expect(result).toEqual(expected);
  });

  it('should map to ForbiddenAccess for EditCapabilitiesCantRemoveLastManageAccess error', async () => {
    // Given
    const subscriptionId = uuidv4() as SubscriptionId;
    vi.spyOn(OwnershipDomain, 'countOwnedRows').mockResolvedValue(1);
    vi.spyOn(UserServiceApp, 'addUserService').mockRejectedValue(
      new Error(ForbiddenErrorCode.EditCapabilitiesCantRemoveLastManageAccess)
    );

    // When
    const call = userServiceResolver.Mutation!.addUserService!(
      {},
      {
        input: {
          subscription_id: subscriptionId,
          email: ['user@test.com'],
          capabilities: [],
        },
        service_instance_id: uuidv4() as ServiceInstanceId,
      },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      name: ErrorType.ForbiddenAccess,
    });
  });
});

describe('edit user service GraphQL mutation', () => {
  it('should check the user service on the service instance and delegate to UserServiceApp', async () => {
    // Given
    const userServiceId = uuidv4() as UserServiceId;
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const countRows = vi
      .spyOn(OwnershipDomain, 'countOwnedRows')
      .mockResolvedValue(1);
    const expected = { id: userServiceId } as Awaited<
      ReturnType<typeof UserServiceApp.editUserService>
    >;
    vi.spyOn(UserServiceApp, 'editUserService').mockResolvedValue(expected);

    // When
    const result = await userServiceResolver.Mutation!.editUserService!(
      {},
      {
        input: { userServiceId, capabilities: ['ACCESS'] },
        service_instance_id: serviceInstanceId,
      },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(countRows).toHaveBeenCalledExactlyOnceWith(
      'User_Service',
      [userServiceId],
      { organizationId: undefined, serviceInstanceId }
    );
    expect(UserServiceApp.editUserService).toHaveBeenCalledWith(userServiceId, [
      'ACCESS',
    ]);
    expect(result).toEqual(expected);
  });
});

describe('delete user service GraphQL mutation', () => {
  it('should check the user services on the service instance and delegate to UserServiceApp', async () => {
    // Given
    const userServiceId = uuidv4() as UserServiceId;
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const expected = {
      userServiceIds: [userServiceId],
    };
    const countRows = vi
      .spyOn(OwnershipDomain, 'countOwnedRows')
      .mockResolvedValue(1);
    vi.spyOn(UserServiceApp, 'deleteUserServices').mockResolvedValue(
      expected as unknown as Awaited<
        ReturnType<typeof UserServiceApp.deleteUserServices>
      >
    );

    // When
    const result = await userServiceResolver.Mutation!.deleteUserServices!(
      {},
      {
        input: { userServiceIds: [userServiceId] },
        service_instance_id: serviceInstanceId,
      },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(countRows).toHaveBeenCalledExactlyOnceWith(
      'User_Service',
      [userServiceId],
      { organizationId: undefined, serviceInstanceId }
    );
    expect(UserServiceApp.deleteUserServices).toHaveBeenCalledWith([
      userServiceId,
    ]);
    expect(result).toMatchObject({ userServiceIds: [userServiceId] });
  });

  it('should map to NotFound for SubscriptionNotFound error', async () => {
    // Given
    vi.spyOn(OwnershipDomain, 'countOwnedRows').mockResolvedValue(1);
    vi.spyOn(UserServiceApp, 'deleteUserServices').mockRejectedValue(
      new Error(NotFoundErrorCode.SubscriptionNotFound)
    );

    // When
    const call = userServiceResolver.Mutation!.deleteUserServices!(
      {},
      {
        input: { userServiceIds: [uuidv4() as UserServiceId] },
        service_instance_id: uuidv4() as ServiceInstanceId,
      },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.NotFound });
  });
});
