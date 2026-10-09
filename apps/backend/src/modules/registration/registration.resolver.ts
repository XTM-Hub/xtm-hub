import { fromGlobalId } from 'graphql-relay/node/node.js';
import {
  AutoRegisterPlatformInput,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { PortalContext } from '../../model/portal-context';
import { getErrorMessage } from '../../utils/error/error-guard.util';
import {
  BadRequestErrorCode,
  ErrorCode,
  UnknownErrorCode,
} from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { BadRequestError } from '../../utils/error/error.util';
import { DeploymentRequestDomain } from '../deployment/deployment.domain';
import { ServiceGroupApp } from '../deployment/group/service-group.app';
import { extractPlatformToken } from '../security-management/token/platform-token.util';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { RegistrationApp } from './registration.app';
import { RegistrationConnectivityApp } from './registration.connectivity.app';

const resolvers: Resolvers = {
  RegisteredPlatform: {
    subscription: ({ id }, _, context) =>
      ServiceInstanceDomain.loadSubscriptionByServiceInstanceAndOrganization(
        context.user.selected_organization_id,
        id as ServiceInstanceId
      ),
    myGroups: ({ id }, _, context) =>
      ServiceGroupApp.loadGroupsByServiceInstanceAndUser(
        id as ServiceInstanceId,
        context.user.id
      ),
    deployment_request: ({ id }, _, __) =>
      DeploymentRequestDomain.loadFullDeploymentRequest({
        service_instance_id: id as ServiceInstanceId,
      }),
    organization: ({ id }, _, context) =>
      context.dataLoaders.registration.ownerOrganizationByServiceInstanceLoader.load(
        id as ServiceInstanceId
      ),
  },
  Query: {
    isPlatformRegistered: async (_, { input }) => {
      try {
        return await RegistrationApp.isPlatformRegistered(input);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.IsPlatformRegisteredUnknownError
        );
      }
    },
    canUnregisterPlatform: async (_, { input }) => {
      try {
        const response = await RegistrationApp.canUnregisterPlatform(input);

        return {
          ...response,
          isPlatformRegistered: true,
          organizationId: response.organizationId ?? undefined,
        };
      } catch (error) {
        if (getErrorMessage(error) === ErrorCode.PlatformNotRegistered) {
          return {
            isPlatformRegistered: false,
          };
        }

        throw mapToGraphQLError(
          error,
          UnknownErrorCode.CanUnregisterPlatformUnknownError
        );
      }
    },
    registeredPlatform: async (_, { input }) =>
      RegistrationApp.loadRegisteredPlatform(input.service_instance_id),
    registeredPlatforms: async (_, { input }) =>
      RegistrationApp.loadRegisteredPlatforms(input),
    saasPlatforms: async (_, args) => RegistrationApp.loadSaasPlatforms(args),
    /**
     * @deprecated Use `refreshPlatformRegistrationConnectivityStatus` instead.
     * This function is no longer used in the OpenCTI platform due to refactoring and the addition of a version value in the new endpoint.
     */
    openCTIPlatformRegistrationStatus: async (_, { input }) =>
      RegistrationApp.loadPlatformRegistrationStatus(input),
    platformAssociatedOrganization: async (_, { platformId, tenantId }) => {
      try {
        return await RegistrationApp.loadPlatformAssociatedOrganization(
          platformId,
          tenantId
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
  Mutation: {
    registerPlatform: async (_, { input }) => {
      try {
        const { id: decodedId, type: decodedType } = fromGlobalId(
          input.organizationId
        );

        const ALLOWED_TYPES = [
          'Organization',
          'IsPlatformRegisteredOrganization',
        ];

        const organizationId = ALLOWED_TYPES.includes(decodedType)
          ? decodedId
          : input.organizationId;

        const payload = {
          ...input,
          // type may not be an OrganizationId, but can be a IsPlatformRegisteredOrganization
          organizationId,
        };
        const token = await RegistrationApp.registerPlatform(payload);
        return { token };
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.RegisterPlatformUnknownError
        );
      }
    },
    unregisterPlatform: async (_, { input }) => {
      try {
        await RegistrationApp.unregisterPlatform(input);
        return { success: true };
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.UnregisterPlatformUnknownError
        );
      }
    },
    refreshUserPlatformToken: async (_, __, context) => {
      try {
        return await RegistrationApp.refreshUserPlatformToken(context.user.id);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.RefreshUserPlatformTokenUnknownError
        );
      }
    },
    refreshPlatformRegistrationConnectivityStatus: async (_, { input }) =>
      RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
        input
      ),
    refreshPlatformRegistrationConnectivityStatusSingleTenant: async (
      _,
      { input }
    ) =>
      RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusSingleTenant(
        input
      ),
    refreshPlatformRegistrationConnectivityStatusAllTenants: async (
      _,
      { input }
    ) =>
      RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusAllTenants(
        input
      ),
    autoRegisterPlatform: async (
      _,
      { platform, input },
      context: PortalContext
    ) => {
      // TODO: Simplify code and remove deprecated input and tests once all trials use the new input type.
      const resolvedInput: AutoRegisterPlatformInput | null =
        input ?? (platform ? { platform } : null);
      if (!resolvedInput) {
        throw BadRequestError(
          BadRequestErrorCode.MissingAutoRegisterPlatformArgument
        );
      }
      const token = extractPlatformToken(context.req);
      if (!token) {
        throw BadRequestError(UnknownErrorCode.UnknownError);
      }
      try {
        await RegistrationApp.autoRegisterPlatform(token, resolvedInput);
        return { success: true };
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.RegisterPlatformUnknownError
        );
      }
    },
  },
};

export default resolvers;
