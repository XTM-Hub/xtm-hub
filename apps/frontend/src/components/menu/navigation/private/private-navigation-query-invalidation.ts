import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { serviceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { platformTrialKeys } from '@graphql/trial/trial.keys';
import type { QueryClient } from '@tanstack/react-query';

export const invalidatePrivateNavigationQueries = (
  queryClient: QueryClient
) => {
  void queryClient.invalidateQueries({ queryKey: serviceInstancesKeys.all() });
  void queryClient.invalidateQueries({
    queryKey: registeredPlatformsKeys.all(),
  });
  void queryClient.invalidateQueries({
    queryKey: platformTrialKeys.platformTrialStatusAll(),
  });
};
