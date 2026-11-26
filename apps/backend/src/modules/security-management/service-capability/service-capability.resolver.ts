import { Resolvers } from '../../../__generated__/resolvers-types';
import { ServiceCapabilityId } from '../../../model/kanel/public/ServiceCapability';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../../utils/scalar.util';
import { ServiceCapabilityApp } from './service-capability.app';

const resolvers: Resolvers = {
  ServiceCapabilityId:
    createRelayIdScalar<ServiceCapabilityId>('Service_Capability'),
  Query: {
    userServiceCapabilities: async (_, { service_instance_id }) => {
      try {
        return await ServiceCapabilityApp.loadServiceCapabilitiesByServiceId(
          service_instance_id
        );
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.AddCapabilitiesError);
      }
    },
  },
};
export default resolvers;
