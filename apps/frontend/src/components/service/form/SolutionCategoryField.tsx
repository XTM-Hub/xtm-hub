import { useSolutionCategories } from '@/components/service/form/UseSolutionCategories';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { useFormField } from '@filigran/ui';
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
  const { error } = useFormField();
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
    <AppCombobox
      multiple
      label={t('Service.Form.SolutionCategoriesLabel')}
      placeholder={t('Service.Form.SolutionCategoriesPlaceholder')}
      error={error?.message}
      disabled={disabled}
      options={solutionCategoryOptionIds.ids}
      value={field.value ?? []}
      onValueChange={field.onChange}
      getOptionLabel={solutionCategoryOptionIds.getOptionLabel}
      contentClassName="layer-2"
    />
  );
};
