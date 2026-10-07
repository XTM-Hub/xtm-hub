'use client';
import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { FILIGRAN_PRODUCTS_ORDER } from '@/components/epic/filigran-products';
import { useTranslate } from '@/hooks/use-translate';
import { SearchField, Switch } from '@filigran/design-system';
import { MultiSelectFormField } from '@filigran/ui';
import { FiligranProduct } from '@graphql/generated';
import React, { useMemo } from 'react';

export type EpicFilterType = FiligranProduct[];

interface EpicFilterProps {
  selectedFilter?: EpicFilterType;
  onSelectedFilterChange: (filter: EpicFilterType) => void;
  countsByProduct: Record<FiligranProduct, number>;
  showFinished: boolean;
  onShowFinishedChange: (show: boolean) => void;
  debounceHandleInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClear?: () => void;
}

export const EpicFilter = ({
  selectedFilter,
  onSelectedFilterChange,
  countsByProduct,
  showFinished,
  onShowFinishedChange,
  debounceHandleInput,
  onSearchClear,
}: EpicFilterProps) => {
  const t = useTranslate();

  const options = useMemo(
    () =>
      FILIGRAN_PRODUCTS_ORDER.map((product) => ({
        id: product,
        label: `${FiligranProductMapping[product].name} (${countsByProduct[product] ?? 0})`,
      })),
    [countsByProduct]
  );

  return (
    <div className="mx-s grid grid-cols-1 sm:grid-cols-3 gap-l items-center">
      <div className="max-w-full sm:max-w-[100%]">
        <SearchField
          fullWidth
          aria-label={t('GenericActions.Search')}
          placeholder={t('GenericActions.Search')}
          onChange={debounceHandleInput}
          onClear={onSearchClear}
        />
      </div>

      <div className="max-w-full sm:max-w-[100%]">
        <MultiSelectFormField
          options={options}
          popoverContentClassName="bg-elevation-background-layer-3"
          keyValue="id"
          keyLabel="label"
          defaultValue={selectedFilter}
          value={selectedFilter}
          onValueChange={(value) =>
            onSelectedFilterChange(value as EpicFilterType)
          }
          noResultString={t('Utils.NotFound')}
          placeholder={t('Epic.FilterByProduct')}
          variant="inverted"
        />
      </div>
      <div className="ml-auto">
        <Switch
          label={t('Epic.ShowFinished')}
          checked={showFinished}
          onCheckedChange={onShowFinishedChange}
        />
      </div>
    </div>
  );
};
