import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectHelperText,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
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
  selectClassName?: string;
}

export const TranslatableEnumSelectField = <T extends FieldValues>({
  field,
  label,
  placeholder,
  values,
  translationNamespace,
  error,
  selectClassName,
}: TranslatableEnumSelectFieldProps<T>) => {
  const t = useTranslate();
  return (
    <div>
      <Select
        value={field.value}
        onValueChange={field.onChange}
        error={Boolean(error)}>
        <SelectLabel required>{label}</SelectLabel>
        <SelectTrigger className={cn('w-full', selectClassName)}>
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
        {error && <SelectHelperText>{error}</SelectHelperText>}
      </Select>
    </div>
  );
};
