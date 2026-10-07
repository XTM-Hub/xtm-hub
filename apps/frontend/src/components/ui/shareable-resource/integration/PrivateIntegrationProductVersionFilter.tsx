import { IntegrationProductVersionFilter } from '@/components/ui/shareable-resource/integration/IntegrationProductVersionFilter';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { PlatformIdentifier } from '@graphql/generated';
import { useMemo } from 'react';

export const PrivateIntegrationProductVersionFilter = () => {
  const { platforms } = useRegisteredPlatforms(PlatformIdentifier.Opencti, {
    onlyActive: true,
  });
  // Several instances can run the same version: keep every instance name.
  const registeredInstancesByVersion = useMemo(() => {
    const instancesByVersion: Record<string, string[]> = {};
    for (const { version, title, url } of platforms) {
      if (!version) continue;
      (instancesByVersion[version] ??= []).push(title || url || version);
    }
    return instancesByVersion;
  }, [platforms]);

  return (
    <IntegrationProductVersionFilter
      registeredInstancesByVersion={registeredInstancesByVersion}
    />
  );
};
