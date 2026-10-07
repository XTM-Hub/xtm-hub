import {
  FormItem,
  useFormField,
} from '@/components/filigran-ui/components/clients';
import { fromFileSelectValue, toFileSelectValue } from '@/utils/documents';
import { FileSelect, type FileSelectProps } from '@filigran/design-system';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormFile = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const { error } = useFormField();
  const {
    showLabel: _showLabel,
    required: _required,
    value,
    onChange,
    multiple,
    ...rest
  } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;
  const text = fieldConfigItem?.label || label;

  return (
    <FormItem>
      <FileSelect
        label={showLabel ? text : undefined}
        aria-label={showLabel ? undefined : text}
        required={isRequired}
        error={error?.message}
        {...(rest as FileSelectProps)}
        multiple={Boolean(multiple)}
        value={toFileSelectValue(value, Boolean(multiple))}
        onValueChange={(next) =>
          (onChange as (value: File[] | undefined) => void)(
            fromFileSelectValue(next)
          )
        }
      />
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </FormItem>
  );
};

export default AutoFormFile;
