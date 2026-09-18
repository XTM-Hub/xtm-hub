import {
  Resolvers,
  ServiceInstance,
  SubscriptionModel,
} from '../../__generated__/resolvers-types';

import {
  SubscriptionId,
  SubscriptionMutator,
} from '../../model/kanel/public/Subscription';
import { SubscriptionCapabilityId } from '../../model/kanel/public/SubscriptionCapability';
import { PortalContext } from '../../model/portal-context';
import {
  ErrorCode,
  NotFoundErrorCode,
  UnknownErrorCode,
} from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { NotFoundError } from '../../utils/error/error.util';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { subscriptionApp } from './subscription.app';
import { SubscriptionDomain } from './subscription.domain';

const resolvers: Resolvers = {
  SubscriptionId: createRelayIdScalar<SubscriptionId>('Subscription'),
  SubscriptionModel: {
    subscription_capability: ({ id }, _, context: PortalContext) =>
      context.dataLoaders.subscription.subscriptionCapabilitiesBySubscriptionIdLoader.load(
        id as SubscriptionId
      ),
    service_instance: async (
      { service_instance_id },
      _,
      context: PortalContext
    ) => {
      const instance =
        await context.dataLoaders.subscription.serviceInstanceBySubscriptionServiceInstanceIdLoader.load(
          service_instance_id
        );
      if (!instance)
        throw NotFoundError(NotFoundErrorCode.ServiceInstanceNotFound);
      return instance as unknown as ServiceInstance;
    },
    user_service: ({ id }, _, context: PortalContext) =>
      context.dataLoaders.subscription.userServicesBySubscriptionIdLoader.load(
        id as SubscriptionId
      ),
    organization: async ({ organization_id }, _, context: PortalContext) => {
      const orga =
        await context.dataLoaders.subscription.organizationBySubscriptionOrganizationIdLoader.load(
          organization_id
        );
      if (!orga) {
        throw new Error(ErrorCode.OrganizationNotFound);
      }
      return orga;
    },
  },
  SubscriptionCapability: {
    service_capability: ({ id }, _, context: PortalContext) =>
      context.dataLoaders.subscription.serviceCapabilityBySubscriptionCapabilityIdLoader.load(
        id as SubscriptionCapabilityId
      ),
  },
  Mutation: {
    createSubscriptions: async (_, { input }) => {
      try {
        return (await subscriptionApp.subscribeOrganizationsToService({
          organizationIds: input.organization_id,
          serviceInstanceId: input.service_instance_id,
          startDate: input.start_date,
          endDate: input.end_date,
          capabilityIds: input.capability_ids ?? [],
        })) as unknown as SubscriptionModel[];
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.ServiceSubscriptionError
        );
      }
    },
    deleteSubscriptions: async (_, { subscription_ids }) => {
      try {
        return (await subscriptionApp.deleteSubscriptions(
          subscription_ids
        )) as unknown as SubscriptionModel[];
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeleteSubscriptionError
        );
      }
    },
    updateSubscription: async (_, { subscription_id, input }) => {
      try {
        return (await subscriptionApp.updateSubscription({
          id: subscription_id,
          startDate: input.start_date,
          endDate: input.end_date,
          capabilityIds: input.capability_ids ?? undefined,
        })) as unknown as SubscriptionModel;
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.ServiceSubscriptionError
        );
      }
    },
  },
  Query: {
    subscriptionById: async (_, { subscription_id }) => {
      const subscriptions =
        await SubscriptionDomain.loadSubscriptionWithOrganizationAndCapabilitiesBy(
          {
            'Subscription.id': subscription_id,
          } as SubscriptionMutator
        );

      return subscriptions[0];
    },
    subscriptions: async (_, opt) => {
      return subscriptionApp.loadSubscriptions(opt);
    },
  },
};

export default resolvers;
