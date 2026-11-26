import { FormItem, useFormField } from '@/components/ui/form';
import { Input, type InputProps } from '@filigran/design-system';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormNumber = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const { error } = useFormField();

  return (
    <FormItem>
      <Input
        label={fieldConfigItem?.label || label}
        required={isRequired}
        error={error?.message}
        type="number"
        {...(fieldProps as InputProps)}
      />
    </FormItem>
  );
};

export default AutoFormNumber;
