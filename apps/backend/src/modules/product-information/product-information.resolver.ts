import { Resolvers } from '../../__generated__/resolvers-types';
import { ProductInformationApp } from './product-information.app';

const resolvers: Resolvers = {
  Query: {
    registeredSaasPlatformData: async (_, { input }) =>
      ProductInformationApp.loadRegisteredSaasPlatformData(
        input.service_instance_id,
        input.metrics_period
      ),
  },
};

export default resolvers;
