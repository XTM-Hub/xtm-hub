import {
  MutationAddUserServiceArgs,
  MutationDeleteUserServicesArgs,
  MutationEditUserServiceArgs,
  MutationResolvers,
  QueryResolvers,
  QueryUserServiceFromSubscriptionArgs,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { UserId } from '../../model/kanel/public/User';
import { UserServiceId } from '../../model/kanel/public/UserService';
import { Guarded } from '../../security/guarded/guarded.decorator';
import {
  orgGuard,
  selectedOrganization,
} from '../../security/guarded/guards/organization.guard';
import { belongTo } from '../../security/guarded/ownership';
import { fromArg } from '../../security/guarded/sources';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { UserServiceApp } from './user-service.app';
import { UserServiceDomain } from './user-service.domain';
import { manageUserServices } from './user-service.security';

class UserServiceQueries {
  // Membership only: the rows of a subscription of the selected organization are listed to every member of it
  @Guarded(
    orgGuard<QueryUserServiceFromSubscriptionArgs>({
      organization: selectedOrganization,
      capabilities: [],
    }).targets(
      belongTo('Subscription', ({ subscription_id }) => [subscription_id])
    )
  )
  static readonly userServiceFromSubscription: NonNullable<
    QueryResolvers['userServiceFromSubscription']
  > = (_, { first, after, orderMode, orderBy, subscription_id }) =>
    UserServiceDomain.loadUserServiceBySubscription(
      { first, after, orderMode, orderBy },
      subscription_id
    );
}

class UserServiceMutations {
  @Guarded(
    manageUserServices<MutationAddUserServiceArgs>().targets(
      belongTo('Subscription', ({ input }) => [input.subscription_id], {
        serviceInstance: fromArg('service_instance_id'),
      })
    )
  )
  static readonly addUserService: NonNullable<
    MutationResolvers['addUserService']
  > = async (_, { input }, context) => {
    try {
      return await UserServiceApp.addUserService(
        context.user,
        input.subscription_id,
        input.email,
        input.capabilities ?? []
      );
    } catch (error) {
      throw mapToGraphQLError(error, UnknownErrorCode.AddUserServiceError);
    }
  };

  @Guarded(
    manageUserServices<MutationEditUserServiceArgs>().targets(
      belongTo('User_Service', ({ input }) => [input.userServiceId], {
        serviceInstance: fromArg('service_instance_id'),
      })
    )
  )
  static readonly editUserService: NonNullable<
    MutationResolvers['editUserService']
  > = async (_, { input }) => {
    try {
      return await UserServiceApp.editUserService(
        input.userServiceId,
        input.capabilities ?? []
      );
    } catch (error) {
      throw mapToGraphQLError(error, UnknownErrorCode.AddUserServiceError);
    }
  };

  @Guarded(
    manageUserServices<MutationDeleteUserServicesArgs>().targets(
      belongTo('User_Service', ({ input }) => input.userServiceIds, {
        serviceInstance: fromArg('service_instance_id'),
      })
    )
  )
  static readonly deleteUserServices: NonNullable<
    MutationResolvers['deleteUserServices']
  > = async (_, { input }) => {
    try {
      return await UserServiceApp.deleteUserServices(input.userServiceIds);
    } catch (error) {
      throw mapToGraphQLError(error);
    }
  };
}

const resolvers: Resolvers = {
  UserServiceId: createRelayIdScalar<UserServiceId>('User_Service'),
  UserService: {
    user: ({ user_id }) =>
      UserDomain.loadUserDetails({ 'User.id': user_id as UserId }),
    subscription: ({ id }, _) =>
      UserServiceDomain.loadSubscriptionByUserService(id as UserServiceId),
    user_service_capability: ({ id }, _) =>
      UserServiceDomain.loadUserServiceCapabilities(id as UserServiceId),
  },
  Query: { ...UserServiceQueries },
  Mutation: { ...UserServiceMutations },
};

export default resolvers;
