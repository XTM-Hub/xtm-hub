'use client';
import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { FILIGRAN_PRODUCTS_ORDER } from '@/components/epic/filigran-products';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { SearchField, Switch } from '@filigran/design-system';
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

  const optionIds = useMemo(
    () =>
      toComboboxOptionIds(
        FILIGRAN_PRODUCTS_ORDER,
        (product) => product,
        (product) =>
          `${FiligranProductMapping[product].name} (${countsByProduct[product] ?? 0})`
      ),
    [countsByProduct]
  );

  return (
    <div className="mx-s grid grid-cols-1 sm:grid-cols-3 gap-l items-center">
      <div className="max-w-full sm:max-w-[100%]">
        <SearchField
          fullWidth
          aria-label={t('GenericActions.Search')}
          placeholder={t('GenericActions.Search')}
          clearLabel={t('DesignSystem.SearchField.Clear')}
          onChange={debounceHandleInput}
          onClear={onSearchClear}
        />
      </div>

      <div className="max-w-full sm:max-w-[100%]">
        <AppCombobox
          multiple
          label={t('Epic.FilterByProduct')}
          labelPosition="none"
          placeholder={t('Epic.FilterByProduct')}
          options={optionIds.ids}
          value={selectedFilter ?? []}
          onValueChange={(next) =>
            onSelectedFilterChange(next as EpicFilterType)
          }
          getOptionLabel={optionIds.getOptionLabel}
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
