import { SelectField } from '@/components/ui/SelectField';
import { useTranslate } from '@/hooks/use-translate';
import { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';

interface TranslatableEnumSelectFieldProps<
  T extends FieldValues = FieldValues,
> {
  field: ControllerRenderProps<T, FieldPath<T>>;
  label: string;
  placeholder: string;
  values: string[];
  translationNamespace: string;
  error?: string;
  triggerClassName?: string;
}

export const TranslatableEnumSelectField = <T extends FieldValues>({
  field,
  label,
  placeholder,
  values,
  translationNamespace,
  error,
  triggerClassName,
}: TranslatableEnumSelectFieldProps<T>) => {
  const t = useTranslate();
  return (
    <SelectField
      formField
      label={label}
      required
      placeholder={placeholder}
      options={values.map((value) => ({
        value,
        label: t(`${translationNamespace}.${value}`),
      }))}
      value={field.value}
      onValueChange={field.onChange}
      error={error}
      triggerClassName={triggerClassName}
    />
  );
};
