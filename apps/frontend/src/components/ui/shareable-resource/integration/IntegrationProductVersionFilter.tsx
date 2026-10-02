import { useRegisteredProductVersions } from '@/hooks/use-registered-product-versions';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { Combobox } from '@filigran/ui/clients';
import { PlatformIdentifier } from '@graphql/generated';
import { Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

interface ProductVersionOption {
  value: string;
  label: string;
}

const EMPTY_VERSIONS: string[] = [];

interface IntegrationProductVersionFilterProps {
  registeredVersions?: string[];
}

export const IntegrationProductVersionFilter = ({
  registeredVersions = EMPTY_VERSIONS,
}: IntegrationProductVersionFilterProps = {}) => {
  const t = useTranslations();
  const [search, setSearch] = useState('');

  const { productVersions, setProductVersions } = useServiceListLocalStorage(
    ServiceListLocalStorageKey.OpenCTIIntegrationFeeds
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
  const value = useMemo<ProductVersionOption | undefined>(
    () =>
      selectedVersion
        ? { value: selectedVersion, label: selectedVersion }
        : undefined,
    [selectedVersion]
  );

  const handleValueChange = (option: ProductVersionOption | undefined) => {
    setSearch('');
    setProductVersions(option ? { [option.value]: [] } : {});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearch('');
    }
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
      onOpenChange={handleOpenChange}
      renderItemAdornment={(option) =>
        registeredVersions.includes(option.value) && (
          <Link2
            role="img"
            aria-label={t(
              'Service.OpenctiIntegrations.Filter.ProductVersion.RegisteredTooltip'
            )}
            className="h-4 w-4 shrink-0 text-primary"
          />
        )
      }
    />
  );
};
