import { FormItem, useFormField } from '@/components/ui/form';
import { Textarea, type TextareaProps } from '@filigran/design-system';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormTextarea = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const { error } = useFormField();

  return (
    <FormItem>
      <Textarea
        label={fieldConfigItem?.label || label}
        required={isRequired}
        error={error?.message}
        {...(fieldProps as TextareaProps)}
      />
    </FormItem>
  );
};

export default AutoFormTextarea;
