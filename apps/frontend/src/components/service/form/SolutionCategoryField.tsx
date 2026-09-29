import { useSolutionCategories } from '@/components/service/form/UseSolutionCategories';
import { useTranslate } from '@/hooks/use-translate';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  MultiSelectFormField,
} from '@filigran/ui';
import type { FiligranProduct } from '@graphql/generated';
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

  return (
    <FormItem>
      <FormLabel>{t('Service.Form.SolutionCategoriesLabel')}</FormLabel>
      <FormControl>
        <MultiSelectFormField
          disabled={disabled}
          noResultString={t('Utils.NotFound')}
          options={useSolutionCategories(product)}
          keyValue="id"
          keyLabel="name"
          defaultValue={field.value}
          value={field.value}
          onValueChange={field.onChange}
          popoverContentClassName="bg-elevation-background-layer-3"
          placeholder={t('Service.Form.SolutionCategoriesPlaceholder')}
          variant="inverted"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
