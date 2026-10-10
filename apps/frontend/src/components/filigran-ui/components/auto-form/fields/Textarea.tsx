import { FormItem, useFormField } from '@/components/ui/form';
import { Textarea, type TextareaProps } from '@filigran/design-system';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormTextarea = ({
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
      <Textarea
        label={showLabel ? text : undefined}
        aria-label={showLabel ? undefined : text}
        required={isRequired}
        error={error?.message}
        {...(fieldPropsWithoutShowLabel as TextareaProps)}
      />
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </FormItem>
  );
};

export default AutoFormTextarea;
