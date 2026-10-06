import { useUseCases } from '@/components/admin/use-case/use-use-cases';
import { useTranslate } from '@/hooks/use-translate';
import {
  FormControl,
  FormItem,
  FormLabel,
  MultiSelectFormField,
} from '@filigran/ui';
import type { FiligranProduct } from '@graphql/generated';
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
  return (
    <FormItem>
      <FormLabel>
        {t('Service.Form.UseCasesLabel')}
        {required ? <span className="text-sm text-destructive"> *</span> : null}
      </FormLabel>
      <FormControl>
        <MultiSelectFormField
          disabled={disabled}
          noResultString={t('Utils.NotFound')}
          options={useUseCases({ product })}
          keyValue="id"
          keyLabel="name"
          defaultValue={field.value}
          value={field.value}
          onValueChange={field.onChange}
          popoverContentClassName="bg-elevation-background-layer-3"
          placeholder={t('Service.Form.UseCasesPlaceholder')}
          variant="inverted"
        />
      </FormControl>
    </FormItem>
  );
};
