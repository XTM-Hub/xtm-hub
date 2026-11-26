import { FormItem, useFormField } from '@/components/ui/form';
import { Input, type InputProps } from '@filigran/design-system';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormInput = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const { error } = useFormField();
  const type = (fieldProps.type as InputProps['type']) || 'text';

  return (
    <FormItem className="w-full">
      <Input
        label={fieldConfigItem?.label || label}
        required={isRequired}
        error={error?.message}
        type={type}
        {...(fieldProps as InputProps)}
      />
    </FormItem>
  );
};

export default AutoFormInput;
