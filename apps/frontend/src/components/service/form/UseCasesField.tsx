import { useUseCases } from '@/components/admin/use-case/use-use-cases';
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
      <Combobox<string>
        multiple
        disabled={disabled}
        options={useCaseOptionIds.ids}
        value={field.value ?? []}
        onValueChange={(next) => field.onChange(next as string[])}
        getOptionLabel={useCaseOptionIds.getOptionLabel}>
        <ComboboxLabel required={required}>
          {t('Service.Form.UseCasesLabel')}
        </ComboboxLabel>
        <ComboboxField>
          <ComboboxChips />
          <ComboboxInput placeholder={t('Service.Form.UseCasesPlaceholder')} />
          <ComboboxControls>
            <ComboboxClear />
            <ComboboxTrigger />
          </ComboboxControls>
        </ComboboxField>
        <ComboboxContent
          emptyMessage={t('Utils.NotFound')}
          listAriaLabel={t('Service.Form.UseCasesLabel')}
        />
      </Combobox>
    </FormItem>
  );
};
