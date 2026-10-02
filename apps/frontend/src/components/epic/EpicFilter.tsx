'use client';
import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { FILIGRAN_PRODUCTS_ORDER } from '@/components/epic/filigran-products';
import { SearchInput } from '@/components/ui/SearchInput';
import { MultiSelectFormField, Switch } from '@filigran/ui';
import { FiligranProduct } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

export type EpicFilterType = FiligranProduct[];

interface EpicFilterProps {
  selectedFilter?: EpicFilterType;
  onSelectedFilterChange: (filter: EpicFilterType) => void;
  countsByProduct: Record<FiligranProduct, number>;
  showFinished: boolean;
  onShowFinishedChange: (show: boolean) => void;
  debounceHandleInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EpicFilter = ({
  selectedFilter,
  onSelectedFilterChange,
  countsByProduct,
  showFinished,
  onShowFinishedChange,
  debounceHandleInput,
}: EpicFilterProps) => {
  const t = useTranslations();

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
        <SearchInput
          placeholder={t('GenericActions.Search')}
          onChange={debounceHandleInput}
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
      <div className="ml-auto flex items-center gap-s">
        <Switch
          checked={showFinished}
          onCheckedChange={onShowFinishedChange}
        />
        <span className="text-sm">{t('Epic.ShowFinished')}</span>
      </div>
    </div>
  );
};
