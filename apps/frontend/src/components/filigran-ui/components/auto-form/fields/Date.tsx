import {
  FormControl,
  FormItem,
  FormMessage,
} from '@/components/filigran-ui/components/clients';
import {
  fromDatePickerChange,
  toDatePickerValue,
} from '@/components/ui/date-picker-field.utils';
import { DatePicker } from '@filigran/design-system';
import { useLocale } from 'next-intl';
import AutoFormLabel from '../common/Label';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormDate = ({
  label,
  isRequired,
  field,
  fieldConfigItem,
}: AutoFormInputComponentProps) => {
  const locale = useLocale();

  return (
    <FormItem>
      <AutoFormLabel
        label={fieldConfigItem?.label || label}
        isRequired={isRequired}
      />
      <FormControl>
        <DatePicker
          aria-label={fieldConfigItem?.label || label}
          locale={locale}
          value={toDatePickerValue(field.value)}
          onChange={(date, context) =>
            field.onChange(fromDatePickerChange(date, context))
          }
        />
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />

      <FormMessage />
    </FormItem>
  );
};

export default AutoFormDate;
