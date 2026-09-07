import {
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/ui';
import { useTranslations } from 'next-intl';
import { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';

interface TranslatableEnumSelectFieldProps<
  T extends FieldValues = FieldValues,
> {
  field: ControllerRenderProps<T, FieldPath<T>>;
  label: string;
  placeholder: string;
  values: string[];
  translationNamespace: string;
  className?: string;
  selectClassName?: string;
}

export const TranslatableEnumSelectField = <T extends FieldValues>({
  field,
  label,
  placeholder,
  values,
  translationNamespace,
  className = 'text-sm text-destructive',
  selectClassName,
}: TranslatableEnumSelectFieldProps<T>) => {
  const t = useTranslations();
  return (
    <FormItem>
      <FormLabel>
        {label} <span className={className}>*</span>
      </FormLabel>
      <Select
        value={field.value}
        onValueChange={field.onChange}>
        <SelectTrigger className={selectClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={selectClassName}>
          {values.map((value) => (
            <SelectItem
              key={value}
              value={value}>
              {t(`${translationNamespace}.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage className={className} />
    </FormItem>
  );
};
