import {
  MutationResolvers,
  MutationUpdatePlatformServiceMetadataArgs,
  OrganizationCapability,
  QueryResolvers,
  QueryServiceInstanceByIdArgs,
  Resolvers,
} from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { listen } from '../../../pub';
import { Guarded, Public } from '../../../security/guarded/guarded.decorator';
import { allOf, anyOf } from '../../../security/guarded/guards/combinators';
import {
  orgGuard,
  selectedOrganization,
} from '../../../security/guarded/guards/organization.guard';
import {
  bypassOnlyGuard,
  loggedInGuard,
} from '../../../security/guarded/guards/portal.guard';
import {
  publicServiceInstance,
  subscribedGuard,
} from '../../../security/guarded/guards/service-instance.guard';
import { fromArg } from '../../../security/guarded/sources';
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

class ServiceInstanceQueries {
  @Guarded(loggedInGuard())
  static readonly serviceInstances: NonNullable<
    QueryResolvers['serviceInstances']
  > = (_, opt) => ServiceInstanceDomain.loadServiceInstances(opt);

  @Public()
  static readonly serviceInstanceLinksByTags: NonNullable<
    QueryResolvers['serviceInstanceLinksByTags']
  > = (_, { tags }) => ServiceInstanceApp.loadLinkServiceInstancesByTags(tags);

  // loggedInGuard keeps visitors out: the ServiceInstance field resolvers read context.user, which a visitor does not
  // have. The app load stays the row filter, and still refuses a platform admin on a hidden instance
  @Guarded(
    allOf(
      loggedInGuard(),
      anyOf(
        publicServiceInstance<QueryServiceInstanceByIdArgs>({
          serviceInstance: fromArg('service_instance_id'),
        }),
        subscribedGuard<QueryServiceInstanceByIdArgs>({
          serviceInstance: fromArg('service_instance_id'),
        })
      )
    )
  )
  static readonly serviceInstanceById: NonNullable<
    QueryResolvers['serviceInstanceById']
  > = async (_, { service_instance_id }) => {
    try {
      return await ServiceInstanceApp.loadServiceInstance(service_instance_id);
    } catch (error) {
      throw mapToGraphQLError(error);
    }
  };

  @Public()
  static readonly seoServiceInstances: NonNullable<
    QueryResolvers['seoServiceInstances']
  > = () => ServiceInstanceApp.loadSeoServiceInstances();

  @Public()
  static readonly seoServiceInstance: NonNullable<
    QueryResolvers['seoServiceInstance']
  > = async (_, { slug }) => {
    try {
      return await ServiceInstanceApp.loadSeoServiceInstance(slug);
    } catch (error) {
      if (getErrorMessage(error) === ErrorCode.ServiceNotFound) {
        throw NotFoundError(ErrorCode.ServiceNotFound, { slug });
      }

      throw mapToGraphQLError(error);
    }
  };
}

class ServiceInstanceMutations {
  @Guarded(bypassOnlyGuard())
  static readonly addServicePicture: NonNullable<
    MutationResolvers['addServicePicture']
  > = async (_, input) => {
    try {
      return await ServiceInstanceApp.addServicePicture(
        input.serviceInstanceId,
        input.document,
        input.isLogo
      );
    } catch (error) {
      throw mapToGraphQLError(error);
    }
  };

  // The app loads the instance through the subscription of the selected organization
  @Guarded(
    orgGuard<MutationUpdatePlatformServiceMetadataArgs>({
      organization: selectedOrganization,
      capabilities: [OrganizationCapability.ManagePlatformRegistration],
    })
  )
  static readonly updatePlatformServiceMetadata: NonNullable<
    MutationResolvers['updatePlatformServiceMetadata']
  > = async (_, { input }, context) => {
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
  };
}

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
  Query: { ...ServiceInstanceQueries },
  Mutation: { ...ServiceInstanceMutations },
  Subscription: {
    ServiceInstance: {
      subscribe: (_, __, context) => listen(context, ['ServiceInstance']),
    },
  },
};

export default resolvers;
