import { FormItem, useFormField } from '@/components/ui/form';
import { Input, type InputProps } from '@filigran/design-system';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormInput = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const { error } = useFormField();
  const { showLabel: _showLabel, ...fieldPropsWithoutShowLabel } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;
  const type = (fieldProps.type as InputProps['type']) || 'text';
  const text = fieldConfigItem?.label || label;

  return (
    <div className="flex flex-row  items-center space-x-2">
      <FormItem className="flex w-full flex-col justify-start">
        <Input
          label={showLabel ? text : undefined}
          aria-label={showLabel ? undefined : text}
          required={isRequired}
          error={error?.message}
          type={type}
          {...(fieldPropsWithoutShowLabel as InputProps)}
        />
        <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      </FormItem>
    </div>
  );
};

export default AutoFormInput;
