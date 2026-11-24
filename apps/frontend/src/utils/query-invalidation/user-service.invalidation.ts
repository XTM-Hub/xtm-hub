import { serviceUserCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { userServicesKeys } from '@graphql/user-service/user-service.keys';
import type { QueryClient } from '@tanstack/react-query';

/**
 * A user service write changes the users of the subscription and, when the
 * user edits their own access, the user's capabilities on the service (cached
 * 10 minutes). Both are invalidated together so neither shows stale access.
 */
export const invalidateUserServiceQueries = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: userServicesKeys.all() }),
    queryClient.invalidateQueries({
      queryKey: serviceUserCapabilitiesKeys.all(),
    }),
  ]);
