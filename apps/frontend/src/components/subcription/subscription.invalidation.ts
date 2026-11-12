import { organizationSubscribedServicesKeys } from '@graphql/organization-subscribed-services/organization-subscribed-services.keys';
import { serviceUserCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import type { QueryClient } from '@tanstack/react-query';

/**
 * A subscription write changes more than the service's own list: the admin page
 * of the organization lists its subscribed services, and the user's capabilities
 * on a service (cached 10 minutes) derive from the subscription. All of them are
 * invalidated together so none shows stale access.
 */
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
