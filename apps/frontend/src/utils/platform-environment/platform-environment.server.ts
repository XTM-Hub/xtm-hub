import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import {
  PlatformEnvironmentDocument,
  PlatformEnvironmentQuery,
} from '@graphql/generated';
import { cache } from 'react';

const PRODUCTION_ENVIRONMENT = 'production';

// Read from the API at runtime: NEXT_PUBLIC_* values are inlined at build time
// and every built image reports the same one, whatever it is deployed to.
// Shared through the Data Cache like public pages, and deduplicated across the
// layouts of a single render.
export const fetchPlatformEnvironment = cache(
  async (): Promise<string | null> => {
    try {
      const data = await serverGraphqlFetch<PlatformEnvironmentQuery>(
        PlatformEnvironmentDocument,
        {},
        {
          cache: undefined,
          next: { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS },
        }
      );
      return data?.settings?.environment || null;
    } catch {
      return null;
    }
  }
);

// An unknown environment counts as non-production.
export const isProductionPlatform = async (): Promise<boolean> =>
  (await fetchPlatformEnvironment()) === PRODUCTION_ENVIRONMENT;
