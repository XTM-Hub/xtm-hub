import { FormItem, useFormField } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import {
  fromDatePickerChange,
  getDatePickerLabels,
  toDatePickerValue,
} from '@/utils/design-system/date-picker';
import { DatePicker } from '@filigran/design-system';
import { useLocale } from 'next-intl';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormDate = ({
  label,
  isRequired,
  field,
  fieldConfigItem,
}: AutoFormInputComponentProps) => {
  const t = useTranslate();
  const locale = useLocale();
  const { error } = useFormField();
  const text = fieldConfigItem?.label || label;

  return (
    <FormItem>
      <DatePicker
        {...getDatePickerLabels(t, text)}
        label={text}
        required={isRequired}
        error={error?.message}
        locale={locale}
        value={toDatePickerValue(field.value)}
        onChange={(date, context) =>
          field.onChange(fromDatePickerChange(date, context))
        }
      />
    </FormItem>
  );
};

export default AutoFormDate;
