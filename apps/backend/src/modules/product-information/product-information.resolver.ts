import { Resolvers } from '../../__generated__/resolvers-types';
import { ProductInformationApp } from './product-information.app';

const resolvers: Resolvers = {
  SaasPlatform: {
    registered_platform: ({ id }, _, context) =>
      context.dataLoaders.registration.saasRegisteredPlatformByPlatformIdLoader.load(
        id
      ),
  },
  Query: {
    registeredSaasPlatformData: async (_, { input }) =>
      ProductInformationApp.loadRegisteredSaasPlatformData(
        input.service_instance_id,
        input.metrics_period
      ),
    saasManagerPlatforms: async (_, args) =>
      ProductInformationApp.loadSaasManagerPlatforms(args),
  },
};

export default resolvers;
