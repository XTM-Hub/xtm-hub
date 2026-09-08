import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { SelectedValuesDisplay } from '@/components/ui/shareable-resource/logical-multi-select/SelectedValuesDisplay';
import {
  groupInstanceNamesByVersion,
  sortVersionsWithRegisteredFirst,
} from '@/components/ui/shareable-resource/OpenctiVersionFilter.utils';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { useRegisteredProductVersions } from '@/hooks/use-registered-product-versions';
import {
  clearJustAddedFilter,
  useServiceListFilters,
  wasFilterJustAdded,
} from '@/hooks/use-service-list-filters';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { cn } from '@/lib/utils';
import { CheckIcon, InfoIcon } from '@filigran/icon';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  SimpleTooltip,
} from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
import { PlatformIdentifier } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

interface OpenctiVersionFilterProps {
  platformIdentifier: PlatformIdentifier;
  /**
   * On public pages there is no authenticated user/organization, so the
   * registered-instance lookup (and its "you already have this version"
   * tooltip) must be skipped entirely.
   */
  publicPath?: boolean;
}

/**
 * Client-side-only OpenCTI version filter for connectors. Unlike
 * ProductVersionFilter, the selection made here is never sent to the backend
 * as a query filter: it only drives the grey-out of incompatible connector
 * cards (see ShareableResourceCard). It is used instead of ProductVersionFilter
 * when the DECOUPLING_CONNECTORS feature flag is enabled.
 */
export const OpenctiVersionFilter = ({
  platformIdentifier,
  publicPath = false,
}: OpenctiVersionFilterProps) => {
  const t = useTranslations();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { productVersions } = useRegisteredProductVersions(platformIdentifier);

  // Versions the org already has a registered instance for, used to flag
  // matching options with a tooltip below listing the instance name(s).
  const { platforms } = useRegisteredPlatforms(platformIdentifier, {
    onlyActive: true,
    skip: publicPath,
  });
  const registeredInstanceNamesByVersion = useMemo(
    () => groupInstanceNamesByVersion(platforms),
    [platforms]
  );

  const versions = useMemo(
    () =>
      sortVersionsWithRegisteredFirst(
        productVersions,
        registeredInstanceNamesByVersion
      ),
    [productVersions, registeredInstanceNamesByVersion]
  );

  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const { openctiVersions, setOpenctiVersions, removeOpenctiVersions } =
    useServiceListLocalStorage(localStorageKey);
  const selectedVersion = Object.keys(openctiVersions)[0];

  // This component mounts both when the filter is freshly picked from the
  // add-filter dropdown and on page load when it was already selected in a
  // previous session. Only the former should auto-open the popover, so we
  // rely on a one-time, non-persisted flag set by `addFilter` rather than
  // inferring it from the (unreliable, e.g. filter added but no value
  // picked yet) presence of a selected version.
  const [isPopoverOpen, setIsPopoverOpen] = useState(() =>
    wasFilterJustAdded(localStorageKey, ServiceListFilterKey.OpenctiVersion)
  );

  useEffect(() => {
    clearJustAddedFilter(localStorageKey, ServiceListFilterKey.OpenctiVersion);
  }, [localStorageKey]);

  const { removeFilter } = useServiceListFilters();
  const removeOpenctiVersionsFilter = () => {
    removeOpenctiVersions();
    removeFilter(ServiceListFilterKey.OpenctiVersion);
  };

  // Single-select: picking a version replaces any previous selection;
  // picking the already-selected version clears it.
  const selectVersion = (version: string) => {
    setOpenctiVersions(version === selectedVersion ? {} : { [version]: [] });
    setIsPopoverOpen(false);
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          className="flex h-auto min-h-9 w-full items-center justify-between bg-inherit p-0 hover:bg-hover">
          <SelectedValuesDisplay
            groupedSelections={
              selectedVersion
                ? [
                    {
                      parentValue: selectedVersion,
                      parentLabel: selectedVersion,
                      children: [],
                    },
                  ]
                : []
            }
            optionLabel={t(
              'Service.OpenctiIntegrations.Filter.OpenCTIVersion.Label'
            )}
            placeholder={t(
              'Service.OpenctiIntegrations.Filter.OpenCTIVersion.Placeholder'
            )}
            onRemove={removeOpenctiVersionsFilter}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 drop-shadow-sm"
        align="start"
        onEscapeKeyDown={() => setIsPopoverOpen(false)}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}>
        <Command>
          <CommandInput
            ref={searchInputRef}
            placeholder="Search..."
          />
          <CommandList>
            <CommandEmpty>{t('Utils.NotFound')}</CommandEmpty>
            <CommandGroup>
              {versions.map((version) => {
                const isSelected = version === selectedVersion;
                return (
                  <CommandItem
                    key={version}
                    value={version}
                    onSelect={() => selectVersion(version)}
                    className="cursor-pointer">
                    {isSelected && (
                      <CheckIcon className="mr-2 h-4 w-4 shrink-0" />
                    )}
                    <span className={cn('flex-1', !isSelected && 'ml-6')}>
                      {version}
                    </span>
                    {registeredInstanceNamesByVersion.has(version) && (
                      <SimpleTooltip
                        title={t(
                          'Service.OpenctiIntegrations.Filter.OpenCTIVersion.RegisteredInstanceTooltip',
                          {
                            count:
                              registeredInstanceNamesByVersion.get(version)!
                                .length,
                            names: registeredInstanceNamesByVersion
                              .get(version)!
                              .join(', '),
                          }
                        )}>
                        <InfoIcon className="pl-xs h-5 w-5 text-feedback-info-primary" />
                      </SimpleTooltip>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <div className="flex items-center justify-between">
                {selectedVersion && (
                  <>
                    <CommandItem
                      onSelect={() => setOpenctiVersions({})}
                      className="flex-1 cursor-pointer justify-center">
                      {t('Utils.Clear')}
                    </CommandItem>
                    <Separator
                      orientation="vertical"
                      className="flex h-full min-h-6"
                    />
                  </>
                )}
                <CommandItem
                  onSelect={() => setIsPopoverOpen(false)}
                  className="flex-1 cursor-pointer justify-center">
                  {t('Utils.Close')}
                </CommandItem>
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
