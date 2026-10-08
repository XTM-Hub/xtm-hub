import {
  FormItem,
  useFormField,
} from '@/components/filigran-ui/components/clients';
import {
  fromDatePickerChange,
  getDatePickerLabels,
  toDatePickerValue,
} from '@/components/ui/date-picker-field.utils';
import { useTranslate } from '@/hooks/use-translate';
import { DatePicker } from '@filigran/design-system';
import { useLocale } from 'next-intl';
import AutoFormTooltip from '../common/Tooltip';
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
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </FormItem>
  );
};

export default AutoFormDate;
