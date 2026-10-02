'use client';

import { portalGraphqlClient } from '@/lib/graphql-client';
import { compareVersions } from '@/utils/versioning';
import {
  PlatformIdentifier,
  useRegisteredProductVersionsListQuery,
} from '@graphql/generated';
import { registeredProductVersionsKeys } from '@graphql/manage-product-version/registered-product-versions.keys';
import { useMemo } from 'react';

const EMPTY_VERSIONS: string[] = [];

interface UseRegisteredProductVersionsOptions {
  /**
   * Case-insensitive substring filter forwarded to the backend. Only the 5
   * latest matching versions are ever returned.
   */
  search?: string;
  /**
   * Versions the organization already has a registered (active) instance
   * for, e.g. from `useRegisteredPlatforms`. Pass this in the private part
   * of the app only — it is left empty on public, unauthenticated pages.
   * Pinned first, even if they fall outside of the 5 latest, but only in
   * the default (no search) state.
   */
  registeredVersions?: string[];
}

/**
 * Lists the 5 latest known versions of a product (e.g. OpenCTI) from the
 * (public) `registeredProductVersions` query, optionally narrowed down by a
 * search term. When there is no active search, any given `registeredVersions`
 * are pinned first.
 */
export const useRegisteredProductVersions = (
  product: PlatformIdentifier,
  options: UseRegisteredProductVersionsOptions = {}
) => {
  const { search = '', registeredVersions = EMPTY_VERSIONS } = options;
  const trimmedSearch = search.trim();

  const variables = { product, search: trimmedSearch || null };
  const { data } = useRegisteredProductVersionsListQuery(
    portalGraphqlClient,
    variables,
    { queryKey: registeredProductVersionsKeys.list(variables) }
  );
  // Already ordered by version_padded desc (newest first) and capped to 5 on the backend.
  const latestVersions = useMemo(
    () =>
      data?.registeredProductVersions.map((entry) => entry.version) ??
      EMPTY_VERSIONS,
    [data]
  );

  // Only pin the registered version(s) at the top in the default (no
  // search) state; while actively searching, only the matching results
  // (already filtered by the backend) are shown.
  const versions = useMemo(() => {
    if (trimmedSearch) {
      return latestVersions;
    }
    const sortedRegisteredVersions = [...new Set(registeredVersions)]
      .sort(compareVersions)
      .reverse();
    const otherVersions = latestVersions.filter(
      (version) => !sortedRegisteredVersions.includes(version)
    );
    return [...sortedRegisteredVersions, ...otherVersions];
  }, [trimmedSearch, latestVersions, registeredVersions]);

  return { versions };
};
