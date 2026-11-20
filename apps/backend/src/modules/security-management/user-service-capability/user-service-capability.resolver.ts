import {
  MutationAddCapabilitiesToUserServicesArgs,
  MutationResolvers,
  Resolvers,
} from '../../../__generated__/resolvers-types';
import { Guarded } from '../../../security/guarded/guarded.decorator';
import { belongTo } from '../../../security/guarded/ownership';
import { fromArg } from '../../../security/guarded/sources';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../utils/error/error.mapping';
import { manageUserServices } from '../../user-service/user-service.security';
import { UserServiceCapabilityApp } from './user-service-capability.app';

class UserServiceCapabilityMutations {
  @Guarded(
    manageUserServices<MutationAddCapabilitiesToUserServicesArgs>().targets(
      belongTo('User_Service', ({ input }) => input.userServiceIds, {
        serviceInstance: fromArg('service_instance_id'),
      })
    )
  )
  static readonly addCapabilitiesToUserServices: NonNullable<
    MutationResolvers['addCapabilitiesToUserServices']
  > = async (_, { input }) => {
    try {
      return UserServiceCapabilityApp.addCapabilitiesToUserServices(
        input.userServiceIds,
        input.capabilities
      );
    } catch (error) {
      throw mapToGraphQLError(error, UnknownErrorCode.AddCapabilitiesError);
    }
  };
}

const resolvers: Resolvers = {
  Mutation: { ...UserServiceCapabilityMutations },
};

export default resolvers;
