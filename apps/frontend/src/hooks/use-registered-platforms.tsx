import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import {
  PlatformIdentifier,
  RegisteredPlatformsListQuery,
  useRegisteredPlatformsListQuery,
} from '@graphql/generated';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';

export type RegisteredPlatformsListItem =
  RegisteredPlatformsListQuery['registeredPlatforms'][number];

const NO_PLATFORMS: RegisteredPlatformsListItem[] = [];

interface UseRegisteredPlatformsOptions {
  onlyActive?: boolean;
}

export const useRegisteredPlatforms = (
  platformIdentifier: PlatformIdentifier,
  options: UseRegisteredPlatformsOptions = {}
) => {
  const { onlyActive = false } = options;
  // Same variables as the other callers of the list, so they share its cache entry.
  const variables = {
    input: {
      identifier: platformIdentifier,
      onlyActive,
      onlyTrial: null,
      hasDeployedResources: null,
    },
  };
  const { data, isPending } = useRegisteredPlatformsListQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: registeredPlatformsKeys.list(variables),
      throwOnError: throwOnFirstLoadError,
    }
  );

  return {
    platforms: data?.registeredPlatforms ?? NO_PLATFORMS,
    /** True until the first answer: an empty list then means "not known yet", not "none". */
    isPending,
  };
};
