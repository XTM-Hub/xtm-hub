'use client';

import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  PlatformIdentifier,
  useRegisteredProductVersionsListQuery,
} from '@graphql/generated';
import { registeredProductVersionsKeys } from '@graphql/manage-product-version/registered-product-versions.keys';

export const useRegisteredProductVersions = (product: PlatformIdentifier) => {
  const variables = { product };
  const { data } = useRegisteredProductVersionsListQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: registeredProductVersionsKeys.list(variables),
    }
  );

  return {
    // Already ordered by version_padded desc (newest first) on the backend.
    productVersions:
      data?.registeredProductVersions.map((entry) => entry.version) ?? [],
  };
};
