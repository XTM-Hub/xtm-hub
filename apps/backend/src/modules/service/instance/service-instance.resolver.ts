import { Resolvers } from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { listen } from '../../../pub';
import { getErrorMessage } from '../../../utils/error/error-guard.util';
import { ErrorCode, UnknownErrorCode } from '../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../utils/error/error.mapping';
import { NotFoundError } from '../../../utils/error/error.util';
import { createRelayIdScalar } from '../../../utils/scalar.util';
import { ServiceInstanceApp } from './service-instance.app';
import { ServiceInstanceDomain } from './service-instance.domain';
import {
  organizationServiceInstanceKey,
  serviceInstanceUserOrganizationKey,
} from './service-instance.keys';

const resolvers: Resolvers = {
  ServiceInstanceId: createRelayIdScalar<ServiceInstanceId>('ServiceInstance'),
  ServiceInstance: {
    links: ({ id }, _, context) =>
      context.dataLoaders.serviceInstance.linksByServiceInstanceLoader.load(
        id as ServiceInstanceId
      ),
    service_definition: ({ id }, _, context) =>
      context.dataLoaders.serviceInstance.serviceDefinitionByServiceInstanceLoader.load(
        id as ServiceInstanceId
      ),
    organization_subscribed: ({ id }, _, context) =>
      context.dataLoaders.serviceInstance.organizationSubscribedLoader.load(
        organizationServiceInstanceKey.create({
          organizationId: context.user.selected_organization_id,
          serviceInstanceId: id as ServiceInstanceId,
        })
      ),
    capabilities: ({ id }, _, context) =>
      context.dataLoaders.serviceInstance.capabilitiesLoader.load(
        serviceInstanceUserOrganizationKey.create({
          serviceInstanceId: id as ServiceInstanceId,
          userId: context.user.id,
          organizationId: context.user.selected_organization_id,
        })
      ),
    user_joined: ({ id }, _, context) =>
      context.dataLoaders.serviceInstance.userJoinedLoader.load(
        serviceInstanceUserOrganizationKey.create({
          serviceInstanceId: id as ServiceInstanceId,
          userId: context.user.id,
          organizationId: context.user.selected_organization_id,
        })
      ),
    subscriptions: ({ id }, _, context) =>
      context.dataLoaders.serviceInstance.subscriptionsByServiceInstanceLoader.load(
        organizationServiceInstanceKey.create({
          organizationId: context.user.selected_organization_id,
          serviceInstanceId: id as ServiceInstanceId,
        })
      ),
  },
  Query: {
    serviceInstances: async (_, opt) => {
      return ServiceInstanceDomain.loadServiceInstances(opt);
    },
    serviceInstanceLinksByTags: async (_, { tags }) => {
      return ServiceInstanceApp.loadLinkServiceInstancesByTags(tags);
    },
    serviceInstanceById: async (_, { service_instance_id }) => {
      try {
        return await ServiceInstanceApp.loadServiceInstance(
          service_instance_id
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    seoServiceInstances: async () => {
      return ServiceInstanceApp.loadSeoServiceInstances();
    },
    seoServiceInstance: async (_, { slug }) => {
      try {
        return await ServiceInstanceApp.loadSeoServiceInstance(slug);
      } catch (error) {
        if (getErrorMessage(error) === ErrorCode.ServiceNotFound) {
          throw NotFoundError(ErrorCode.ServiceNotFound, { slug });
        }

        throw mapToGraphQLError(error);
      }
    },
  },
  Mutation: {
    addServicePicture: async (_, input) => {
      try {
        return await ServiceInstanceApp.addServicePicture(
          input.serviceInstanceId,
          input.document,
          input.isLogo
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    updatePlatformServiceMetadata: async (_, { input }, context) => {
      try {
        return await ServiceInstanceApp.updatePlatformServiceMetadata(
          context.user,
          input.serviceInstanceId,
          input
        );
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.UpdatePlatformServiceMetadataError
        );
      }
    },
  },
  Subscription: {
    ServiceInstance: {
      subscribe: (_, __, context) => listen(context, ['ServiceInstance']),
    },
  },
};

export default resolvers;
