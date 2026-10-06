import {
  FormItem,
  useFormField,
} from '@/components/filigran-ui/components/clients';
import { Input, type InputProps } from '@filigran/design-system';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormNumber = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const { error } = useFormField();
  const { showLabel: _showLabel, ...fieldPropsWithoutShowLabel } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;
  const text = fieldConfigItem?.label || label;

  return (
    <FormItem>
      <Input
        label={showLabel ? text : undefined}
        aria-label={showLabel ? undefined : text}
        required={isRequired}
        error={error?.message}
        type="number"
        {...(fieldPropsWithoutShowLabel as InputProps)}
      />
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </FormItem>
  );
};

export default AutoFormNumber;
