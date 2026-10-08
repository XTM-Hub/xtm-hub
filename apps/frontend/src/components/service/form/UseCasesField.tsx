import { useUseCases } from '@/components/admin/use-case/use-use-cases';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import { FormItem } from '@filigran/ui';
import type { FiligranProduct } from '@graphql/generated';
import { useMemo } from 'react';
import { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';

interface ServiceFormUseCasesFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName>;
  disabled?: boolean;
  product?: FiligranProduct;
  required?: boolean;
}

export const ServiceFormUseCasesField = <
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  field,
  disabled,
  product,
  required,
}: ServiceFormUseCasesFieldProps<TFieldValues, TName>) => {
  const t = useTranslate();
  const useCases = useUseCases({ product });
  const useCaseOptionIds = useMemo(
    () =>
      toComboboxOptionIds(
        useCases,
        (useCase) => useCase.id,
        (useCase) => useCase.name
      ),
    [useCases]
  );

  return (
    <FormItem>
      <AppCombobox
        multiple
        label={t('Service.Form.UseCasesLabel')}
        required={required}
        placeholder={t('Service.Form.UseCasesPlaceholder')}
        disabled={disabled}
        options={useCaseOptionIds.ids}
        value={field.value ?? []}
        onValueChange={field.onChange}
        getOptionLabel={useCaseOptionIds.getOptionLabel}
      />
    </FormItem>
  );
};
