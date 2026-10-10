import { FormControl, FormItem } from '@/components/ui/form';
import { Checkbox } from '@filigran/design-system';
import type { ComponentProps } from 'react';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormCheckbox = ({
  label,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  return (
    <FormItem>
      <FormControl>
        <Checkbox
          label={fieldConfigItem?.label || label}
          wrapperClassName="mb-3"
          checked={field.value}
          onCheckedChange={field.onChange}
          {...(fieldProps as ComponentProps<typeof Checkbox>)}
        />
      </FormControl>
    </FormItem>
  );
};

export default AutoFormCheckbox;
