import {
  DeploymentAvailability,
  DeploymentRequestConnection,
  QueryDeploymentRequestsArgs,
  QueryDeploymentRequestsListArgs,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { DeploymentRequestId } from '../../model/kanel/public/DeploymentRequest';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { DeploymentApp } from './deployment.app';
import { DeploymentRequestDomain } from './deployment.domain';

const resolvers: Resolvers = {
  DeploymentRequestId:
    createRelayIdScalar<DeploymentRequestId>('DeploymentRequest'),
  DeploymentRequest: {
    children: ({ id }, _, context) =>
      context.dataLoaders.deploymentRequest.childrenByParentLoader.load(
        id as DeploymentRequestId
      ),
    registered_platform: ({ service_instance_id }, _, context) =>
      context.dataLoaders.registration.registeredPlatformByServiceInstanceLoader.load(
        service_instance_id
      ),
    service_instance: async ({ service_instance_id }, _, context) => {
      const serviceInstance =
        await context.dataLoaders.serviceInstance.serviceInstanceByIdLoader.load(
          service_instance_id
        );
      return serviceInstance ?? null;
    },
  },
  Query: {
    deploymentRequests: async (_, args: QueryDeploymentRequestsArgs) => {
      try {
        return await DeploymentApp.loadPlatformDeploymentRequests(args);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },
    deploymentRequestsAvailable: async (): Promise<
      DeploymentAvailability[]
    > => {
      try {
        return await DeploymentApp.loadAvailableDeploymentRequests();
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },
    deploymentRequestsList: async (
      _,
      args: QueryDeploymentRequestsListArgs
    ) => {
      try {
        return await DeploymentRequestDomain.loadDeploymentRequests<DeploymentRequestConnection>(
          args
        );
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },
    platformTrialStatus: async (_, { organizationId }) => {
      try {
        return await DeploymentApp.loadPlatformTrialStatus(organizationId);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },
    xtmPlatformBundle: async () => {
      try {
        return await DeploymentApp.loadXtmPlatformBundle();
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },
    xtmonePlatformIntegrationStatus: async (_, { serviceInstanceId }) => {
      try {
        return await DeploymentApp.loadXtmonePlatformIntegrationStatus(
          serviceInstanceId
        );
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },
  },

  Mutation: {
    createDeploymentRequest: async (_, { input }) => {
      try {
        return await DeploymentApp.createDeploymentRequest(input);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.CreateDeploymentRequestError
        );
      }
    },
    updateDeploymentRequest: async (_, { input }) => {
      try {
        return await DeploymentApp.updateDeploymentRequest(input);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },
    cancelDeploymentRequest: async (
      _,
      { deploymentRequestId, cancellationReason }
    ) => {
      try {
        return await DeploymentApp.cancelDeploymentRequest(
          deploymentRequestId,
          false,
          cancellationReason ?? undefined
        );
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },
    adminCancelDeploymentRequest: async (_, { deploymentRequestId }) => {
      try {
        return await DeploymentApp.cancelDeploymentRequest(
          deploymentRequestId,
          true
        );
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentRequestUnknownError
        );
      }
    },

    reorderDeploymentRequestInQueue: async (_, { input }) => {
      try {
        return await DeploymentApp.reorderDeploymentRequestInQueue({
          ...input,
          id: input.id,
        });
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },

    updateDeploymentQuotaCapacity: async (_, { input }) => {
      try {
        return await DeploymentApp.updateDeploymentQuotaCapacity(input);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default resolvers;
