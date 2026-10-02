import { portalGraphqlClient } from '@/lib/graphql-client';
import { doesVersionSatisfy } from '@/utils/versioning';
import {
  PlatformIdentifier,
  useRegisteredPlatformsListQuery,
} from '@graphql/generated';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { useMemo } from 'react';

export type ConnectorCompatibilityStatus =
  'unknown' | 'compatible' | 'partial' | 'incompatible';

const OPENCTI_PLATFORMS_VARIABLES = {
  input: {
    identifier: PlatformIdentifier.Opencti,
    onlyActive: true,
    onlyTrial: null,
    hasDeployedResources: null,
  },
};

interface UseConnectorCompatibilityParams {
  minimumDeployableVersion?: string | null;
  enabled?: boolean;
}

interface UseConnectorCompatibilityResult {
  status: ConnectorCompatibilityStatus;
  compatiblePlatforms: string;
  incompatiblePlatforms: string;
  incompatibleCount: number;
}

export const useConnectorCompatibility = ({
  minimumDeployableVersion,
  enabled = true,
}: UseConnectorCompatibilityParams): UseConnectorCompatibilityResult => {
  const { data } = useRegisteredPlatformsListQuery(
    portalGraphqlClient,
    OPENCTI_PLATFORMS_VARIABLES,
    {
      queryKey: registeredPlatformsKeys.list(OPENCTI_PLATFORMS_VARIABLES),
      enabled,
    }
  );

  const platforms = data?.registeredPlatforms;

  return useMemo(() => {
    const empty = {
      status: 'unknown' as const,
      compatiblePlatforms: '',
      incompatiblePlatforms: '',
      incompatibleCount: 0,
    };

    if (!enabled || !minimumDeployableVersion || !platforms?.length) {
      return empty;
    }

    const compatible: string[] = [];
    const incompatible: string[] = [];

    for (const platform of platforms) {
      const target = doesVersionSatisfy({
        givenVersion: platform.version ?? '0.0.0',
        requiredVersion: minimumDeployableVersion,
      })
        ? compatible
        : incompatible;
      target.push(platform.title);
    }

    const status =
      incompatible.length === 0
        ? 'compatible'
        : compatible.length === 0
          ? 'incompatible'
          : 'partial';

    return {
      status,
      compatiblePlatforms: compatible.join(', '),
      incompatiblePlatforms: incompatible.join(', '),
      incompatibleCount: incompatible.length,
    };
  }, [platforms, minimumDeployableVersion, enabled]);
};
