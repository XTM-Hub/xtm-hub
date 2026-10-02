import { IntegrationProductVersionFilter } from '@/components/ui/shareable-resource/integration/IntegrationProductVersionFilter';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { PlatformIdentifier } from '@graphql/generated';
import { useMemo } from 'react';

export const PrivateIntegrationProductVersionFilter = () => {
  const { platforms } = useRegisteredPlatforms(PlatformIdentifier.Opencti, {
    onlyActive: true,
  });
  const registeredVersions = useMemo(
    () =>
      [...new Set(platforms.map((platform) => platform.version))].filter(
        (version): version is string => Boolean(version)
      ),
    [platforms]
  );

  return (
    <IntegrationProductVersionFilter registeredVersions={registeredVersions} />
  );
};
