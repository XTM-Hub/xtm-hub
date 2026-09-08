import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { ServiceListAddFilterCombobox } from '@/components/service/components/header/filter/ServiceListAddFilterCombobox';
import { ServiceListFilterSection } from '@/components/service/components/header/filter/ServiceListFilterSection';
import { SearchInput } from '@/components/ui/SearchInput';
import { SortControls } from '@/components/ui/SortControls';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { cn } from '@/lib/utils';
import { debounceHandleInput } from '@/utils/debounce';
import { CalendarViewMonthIcon, ListViewIcon } from '@filigran/icon';
import { Separator } from '@filigran/ui/clients';
import { DocumentOrdering } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import React from 'react';

export enum ServiceListFilterKey {
  Label = 'label',
  EntityType = 'entity_type',
  IntegrationType = 'integration_type',
  SolutionCategory = 'solution_category',
  LicenseType = 'license_type',
  ProductVersion = 'product_version',
  OpenctiVersion = 'opencti_version',
  ManagerSupported = 'manager_supported',
  Verified = 'verified',
}

export interface ServiceListFilter {
  node: React.ReactNode;
  reset: () => void;
}

export type ServiceListFilterMap = Partial<
  Record<ServiceListFilterKey, ServiceListFilter>
>;

export enum ServiceListDisplayMode {
  Tab = 'tab',
  List = 'list',
}

interface ServiceListHeaderProps {
  search: string;
  onSearchChange: (v: string) => void;
  filters: ServiceListFilterMap;
  paginationControls?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  onDisplayModeChange?: (mode: ServiceListDisplayMode) => void;
}

export const ServiceListHeader = ({
  search,
  onSearchChange,
  filters,
  paginationControls,
  actions,
  className,
  onDisplayModeChange,
}: ServiceListHeaderProps) => {
  const t = useTranslations();

  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const {
    orderBy,
    orderMode,
    setOrderBy,
    setOrderMode,
    displayMode: storedDisplayMode,
    setDisplayMode: setStoredDisplayMode,
  } = useServiceListLocalStorage(localStorageKey);
  const handleDisplayModeChange = (mode: ServiceListDisplayMode) => {
    setStoredDisplayMode(mode);
    onDisplayModeChange?.(mode);
  };

  const sortOptions = [
    DocumentOrdering.Name,
    DocumentOrdering.CreatedAt,
    DocumentOrdering.UpdatedAt,
  ].map((value) => ({
    value,
    label: t(`DocumentOrdering.${value}`),
  }));

  const searchInput = (
    <SearchInput
      containerClass="max-sm:w-full sm:w-[20rem]"
      placeholder={t('GenericActions.Search')}
      defaultValue={search}
      onChange={debounceHandleInput(onSearchChange)}
    />
  );

  const filterNode = (
    <ServiceListAddFilterCombobox
      filterKeys={Object.keys(filters) as ServiceListFilterKey[]}
    />
  );

  const sortControls = (
    <SortControls
      orderByOptions={sortOptions}
      onOrderByChange={(value) => setOrderBy(value as DocumentOrdering)}
      onOrderModeChange={setOrderMode}
      selectedOrderMode={orderMode}
      selectedOrderBy={orderBy}
      className="ml-2"
    />
  );

  return (
    <div className={cn('flex flex-col justify-between gap-m', className)}>
      <div className="flex flex-col gap-m sm:flex-row sm:justify-between sm:gap-s">
        <div className="flex flex-col gap-m flex-1 min-w-0 sm:flex-row sm:items-start sm:justify-between sm:gap-s">
          <div className="flex gap-s flex-wrap items-center min-w-0">
            {searchInput}
            <div className="flex gap-s items-center min-w-0">
              {filterNode}
              {sortControls}
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-s max-sm:w-full',
              paginationControls
                ? 'max-sm:justify-between sm:ml-auto'
                : 'ml-auto'
            )}>
            {paginationControls && (
              <div className="min-w-0 flex-1 max-sm:[&>div]:w-full max-sm:[&>div>*:nth-child(2)]:flex-1">
                {paginationControls}
              </div>
            )}
            <div className="p-s border hover:cursor-pointer flex items-center align-middle gap-s">
              <button
                type="button"
                onClick={() =>
                  handleDisplayModeChange(ServiceListDisplayMode.Tab)
                }
                className="hover:cursor-pointer flex items-center"
                aria-pressed={storedDisplayMode === ServiceListDisplayMode.Tab}
                aria-label={t('Service.List.ViewTab')}>
                <CalendarViewMonthIcon
                  className={cn(
                    'h-5 w-5',
                    storedDisplayMode === ServiceListDisplayMode.Tab
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                />
              </button>
              <Separator
                orientation="vertical"
                className="h-5 w-px bg-border"
              />
              <button
                type="button"
                onClick={() =>
                  handleDisplayModeChange(ServiceListDisplayMode.List)
                }
                className="hover:cursor-pointer flex items-center"
                aria-pressed={storedDisplayMode === ServiceListDisplayMode.List}
                aria-label={t('Service.List.ViewList')}>
                <ListViewIcon
                  className={cn(
                    'h-4 w-4',
                    storedDisplayMode === ServiceListDisplayMode.List
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {actions && (
          <div className="flex gap-s max-sm:order-first max-sm:w-full max-sm:[&>*]:flex-1 max-sm:[&>*>*]:flex-1">
            {actions}
          </div>
        )}
      </div>
      <ServiceListFilterSection filters={filters} />
    </div>
  );
};
