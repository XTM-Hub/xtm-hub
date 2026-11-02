import { FilterSheet } from '@/components/service/components/header/filter/FilterSheet';
import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { Separator } from '@/components/ui/separator';
import { SortControls } from '@/components/ui/SortControls';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { SearchField } from '@filigran/design-system';
import { CalendarViewMonthIcon, ListViewIcon } from '@filigran/icon';
import { DocumentOrdering } from '@graphql/generated';
import React from 'react';

export enum ServiceListFilterKey {
  Label = 'label',
  EntityType = 'entity_type',
  IntegrationType = 'integration_type',
  SolutionCategory = 'solution_category',
  LicenseType = 'license_type',
  ProductVersion = 'product_version',
  ManagerSupported = 'manager_supported',
  Verified = 'verified',
}

export interface ServiceListFilter {
  node: React.ReactNode;
  title?: React.ReactNode;
  noAccordion?: boolean;
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
  paginationControls?: React.ReactNode;
  actions?: React.ReactNode;
  exportAction?: React.ReactNode;
  className?: string;
  onDisplayModeChange?: (mode: ServiceListDisplayMode) => void;
  filters?: ServiceListFilterMap;
}

export const ServiceListHeader = ({
  search,
  onSearchChange,
  paginationControls,
  actions,
  exportAction,
  className,
  onDisplayModeChange,
  filters,
}: ServiceListHeaderProps) => {
  const t = useTranslate();

  const { storageKey } = useServiceListStorageKeyContext();
  const {
    orderBy,
    orderMode,
    setOrderBy,
    setOrderMode,
    displayMode: storedDisplayMode,
    setDisplayMode: setStoredDisplayMode,
  } = useServiceListStorage(storageKey);
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

  const searchHandlers = useDebouncedSearch({
    apply: onSearchChange,
    appliedTerm: search,
  });

  const searchInput = (
    <SearchField
      className="max-sm:w-full sm:w-[20rem]"
      aria-label={t('GenericActions.Search')}
      placeholder={t('GenericActions.Search')}
      clearLabel={t('DesignSystem.SearchField.Clear')}
      defaultValue={search}
      onChange={searchHandlers.onChange}
      onClear={searchHandlers.onClear}
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
    <div className={cn('flex flex-col justify-between gap-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-2">
        <div className="flex flex-col gap-3 flex-1 min-w-0 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <div className="flex gap-2 flex-wrap items-center min-w-0">
            {searchInput}
            <div className="flex gap-2 items-center min-w-0">
              {sortControls}
              {filters && <FilterSheet filters={filters} />}
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 max-sm:w-full',
              paginationControls
                ? 'max-sm:justify-between sm:ml-auto'
                : 'ml-auto'
            )}>
            {paginationControls && (
              <div className="min-w-0 flex-1 max-sm:[&>div]:w-full max-sm:[&>div>*:nth-child(2)]:flex-1">
                {paginationControls}
              </div>
            )}
            <div className="p-2 border hover:cursor-pointer flex items-center align-middle gap-2">
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
                      ? 'text-icon-highlight'
                      : 'text-icon-subtle'
                  )}
                />
              </button>
              <Separator
                orientation="vertical"
                className="h-5"
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
                      ? 'text-icon-highlight'
                      : 'text-icon-subtle'
                  )}
                />
              </button>
            </div>
            {exportAction}
          </div>
        </div>

        {actions && (
          <div className="flex gap-2 max-sm:order-first max-sm:w-full max-sm:[&>*]:flex-1 max-sm:[&>*>*]:flex-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
