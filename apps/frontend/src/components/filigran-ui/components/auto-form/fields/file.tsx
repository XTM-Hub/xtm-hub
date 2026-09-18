import { FileInput, FormControl, FormItem, FormMessage } from '../../clients';
import AutoFormLabel from '../common/label';
import AutoFormTooltip from '../common/tooltip';
import type { AutoFormInputComponentProps } from '../types';
export default function AutoFormFile({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const {
    showLabel: _showLabel,
    required: _required,
    ...fieldPropsWithoutShowLabel
  } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;

  return (
    <FormItem>
      {showLabel && (
        <AutoFormLabel
          label={fieldConfigItem?.label || label}
          isRequired={isRequired}
        />
      )}
      <FormControl>
        <FileInput {...fieldPropsWithoutShowLabel} />
      </FormControl>

      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
}
