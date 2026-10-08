import { AppCombobox } from '@/components/ui/AppCombobox';
import { useRegisteredProductVersions } from '@/hooks/use-registered-product-versions';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTranslate } from '@/hooks/use-translate';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
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
  const value = useMemo<ProductVersionOption | null>(
    () =>
      selectedVersion
        ? { value: selectedVersion, label: selectedVersion }
        : null,
    [selectedVersion]
  );

  const handleValueChange = (option: ProductVersionOption | undefined) => {
    setSearch('');
    setProductVersions(option ? { [option.value]: [] } : {});
  };

  const renderItemAdornment = (option: ProductVersionOption) => {
    const instances = registeredInstancesByVersion[option.value];
    if (!instances?.length) return null;
    const tooltip = t(
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
                aria-label={tooltip}
                className="h-4 w-4 text-primary"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const placeholder = t(
    'Service.OpenctiIntegrations.Filter.ProductVersion.Placeholder'
  );
  const label = t('Service.OpenctiIntegrations.Filter.ProductVersion.Label');

  return (
    <AppCombobox<ProductVersionOption>
      label={label}
      labelPosition="none"
      placeholder={placeholder}
      // The field drops typed text on blur, not when the list closes.
      onBlur={() => setSearch('')}
      options={options}
      value={value}
      onValueChange={(next) => handleValueChange(next ?? undefined)}
      onInputChange={(next, { cause }) => {
        if (cause === 'type') setSearch(next);
      }}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      renderOption={(option) => (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate">{option.label}</span>
          {renderItemAdornment(option)}
        </span>
      )}
    />
  );
};
