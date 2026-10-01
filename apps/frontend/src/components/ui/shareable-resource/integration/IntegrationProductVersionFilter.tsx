import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { useRegisteredProductVersions } from '@/hooks/use-registered-product-versions';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { VerifiedIcon } from '@filigran/icon';
import { Combobox } from '@filigran/ui/clients';
import { PlatformIdentifier } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

interface ProductVersionOption {
  value: string;
  label: string;
}

export const IntegrationProductVersionFilter = () => {
  const t = useTranslations();
  const [search, setSearch] = useState('');

  const { productVersions, setProductVersions } = useServiceListLocalStorage(
    ServiceListLocalStorageKey.OpenCTIIntegrationFeeds
  );

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

  const { versions } = useRegisteredProductVersions(
    PlatformIdentifier.Opencti,
    {
      search,
      registeredVersions,
    }
  );
  const options = useMemo<ProductVersionOption[]>(
    () => versions.map((version) => ({ value: version, label: version })),
    [versions]
  );

  const selectedVersion = Object.keys(productVersions)[0];
  const value = options.find((option) => option.value === selectedVersion);

  const handleValueChange = (option: ProductVersionOption | undefined) => {
    setSearch('');
    setProductVersions(option ? { [option.value]: [] } : {});
  };

  const placeholder = t(
    'Service.OpenctiIntegrations.Filter.ProductVersion.Placeholder'
  );

  return (
    <Combobox
      dataTab={options}
      order={placeholder}
      placeholder={placeholder}
      emptyCommand={t('Utils.NotFound')}
      value={value}
      onValueChange={handleValueChange}
      onInputChange={setSearch}
      renderItemAdornment={(option) =>
        registeredVersions.includes(option.value) && (
          <VerifiedIcon
            title={t(
              'Service.OpenctiIntegrations.Filter.ProductVersion.RegisteredTooltip'
            )}
            className="h-4 w-4 shrink-0 text-feedback-success-primary"
          />
        )
      }
    />
  );
};
