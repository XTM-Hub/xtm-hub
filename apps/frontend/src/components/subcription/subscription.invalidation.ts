import { organizationSubscribedServicesKeys } from '@graphql/organization-subscribed-services/organization-subscribed-services.keys';
import { serviceUserCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import type { QueryClient } from '@tanstack/react-query';

export const invalidateSubscriptionQueries = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.all() }),
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.allById() }),
    queryClient.invalidateQueries({
      queryKey: organizationSubscribedServicesKeys.all(),
    }),
    queryClient.invalidateQueries({
      queryKey: serviceUserCapabilitiesKeys.all(),
    }),
  ]);
