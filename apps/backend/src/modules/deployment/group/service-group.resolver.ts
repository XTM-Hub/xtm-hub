import { Resolvers } from '../../../__generated__/resolvers-types';
import { ServiceGroupId } from '../../../model/kanel/public/ServiceGroup';
import { mapToGraphQLError } from '../../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../../utils/scalar.util';
import { ServiceGroupApp } from './service-group.app';

const resolvers: Resolvers = {
  ServiceGroupId: createRelayIdScalar<ServiceGroupId>('ServiceGroup'),
  ServiceGroup: {
    users: ({ id }) => ServiceGroupApp.loadGroupUsers(id as ServiceGroupId),
  },
  Query: {
    serviceGroups: async (_, { serviceInstanceId }) => {
      try {
        return await ServiceGroupApp.loadGroups({
          serviceInstanceId,
        });
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    bundleUserServiceGroups: async (_, { serviceInstanceId }) => {
      try {
        return await ServiceGroupApp.loadBundleUserServiceGroups(
          serviceInstanceId
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    bundleProducts: async (_, { serviceInstanceId }) => {
      try {
        return await ServiceGroupApp.loadBundleProducts(serviceInstanceId);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
  Mutation: {
    updateServiceGroups: async (_, { input }) => {
      try {
        const parsedInput = input.groups.map((group) => {
          return {
            id: group.id,
            userIds: group.userIds,
          };
        });
        return await ServiceGroupApp.updateGroups(parsedInput);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    addUsersToBundleGroups: async (_, { serviceInstanceId, input }) => {
      try {
        return await ServiceGroupApp.addUsersToBundleGroups(
          serviceInstanceId,
          input
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    removeUsersFromBundleGroups: async (_, { serviceInstanceId, userIds }) => {
      try {
        return await ServiceGroupApp.removeUsersFromBundleGroups(
          serviceInstanceId,
          userIds
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    updateBundleUserGroups: async (_, { serviceInstanceId, input }) => {
      try {
        return await ServiceGroupApp.updateBundleUserGroups(
          serviceInstanceId,
          input
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default resolvers;
