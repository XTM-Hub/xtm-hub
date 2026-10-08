import { useSolutionCategories } from '@/components/service/form/UseSolutionCategories';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import {
  Combobox,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxControls,
  ComboboxField,
  ComboboxInput,
  ComboboxLabel,
  ComboboxTrigger,
} from '@filigran/design-system';
import { FormItem, FormMessage } from '@filigran/ui';
import type { FiligranProduct } from '@graphql/generated';
import { useMemo } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

interface ServiceFormSolutionCategoryFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  disabled?: boolean;
  product?: FiligranProduct;
}

export const ServiceFormSolutionCategoryField = ({
  field,
  disabled,
  product,
}: ServiceFormSolutionCategoryFieldProps) => {
  const t = useTranslate();
  const solutionCategories = useSolutionCategories(product);
  const solutionCategoryOptionIds = useMemo(
    () =>
      toComboboxOptionIds(
        solutionCategories,
        (solutionCategory) => solutionCategory.id,
        (solutionCategory) => solutionCategory.name
      ),
    [solutionCategories]
  );

  return (
    <FormItem>
      <Combobox<string>
        multiple
        disabled={disabled}
        options={solutionCategoryOptionIds.ids}
        value={field.value ?? []}
        onValueChange={(next) => field.onChange(next as string[])}
        getOptionLabel={solutionCategoryOptionIds.getOptionLabel}>
        <ComboboxLabel>
          {t('Service.Form.SolutionCategoriesLabel')}
        </ComboboxLabel>
        <ComboboxField>
          <ComboboxChips />
          <ComboboxInput
            placeholder={t('Service.Form.SolutionCategoriesPlaceholder')}
          />
          <ComboboxControls>
            <ComboboxClear />
            <ComboboxTrigger />
          </ComboboxControls>
        </ComboboxField>
        <ComboboxContent
          emptyMessage={t('Utils.NotFound')}
          listAriaLabel={t('Service.Form.SolutionCategoriesLabel')}
        />
      </Combobox>
      <FormMessage />
    </FormItem>
  );
};
