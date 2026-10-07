import { useRegisteredProductVersions } from '@/hooks/use-registered-product-versions';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTranslate } from '@/hooks/use-translate';
import {
  Combobox,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { PlatformIdentifier } from '@graphql/generated';
import { Link2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ProductVersionOption {
  value: string;
  label: string;
}

const EMPTY_INSTANCES_BY_VERSION: Record<string, string[]> = {};

interface IntegrationProductVersionFilterProps {
  /**
   * Names of the OpenCTI instances the organization has registered, by
   * version (several instances can share one version). Private pages only.
   */
  registeredInstancesByVersion?: Record<string, string[]>;
}

export const IntegrationProductVersionFilter = ({
  registeredInstancesByVersion = EMPTY_INSTANCES_BY_VERSION,
}: IntegrationProductVersionFilterProps = {}) => {
  const t = useTranslate();
  const [search, setSearch] = useState('');
  const registeredVersions = useMemo(
    () => Object.keys(registeredInstancesByVersion),
    [registeredInstancesByVersion]
  );

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
      renderItemAdornment={(option) => {
        const instances = registeredInstancesByVersion[option.value];
        if (!instances?.length) return null;
        const label = t(
          'Service.OpenctiIntegrations.Filter.ProductVersion.RegisteredTooltip',
          { count: instances.length, names: instances.join(', ') }
        );
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0">
                  <Link2
                    role="img"
                    aria-label={label}
                    className="h-4 w-4 text-primary"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }}
    />
  );
};
