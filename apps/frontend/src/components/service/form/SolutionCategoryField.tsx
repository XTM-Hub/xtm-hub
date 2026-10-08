import { useSolutionCategories } from '@/components/service/form/UseSolutionCategories';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
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
      <AppCombobox
        multiple
        label={t('Service.Form.SolutionCategoriesLabel')}
        placeholder={t('Service.Form.SolutionCategoriesPlaceholder')}
        disabled={disabled}
        options={solutionCategoryOptionIds.ids}
        value={field.value ?? []}
        onValueChange={field.onChange}
        getOptionLabel={solutionCategoryOptionIds.getOptionLabel}
      />
      <FormMessage />
    </FormItem>
  );
};
