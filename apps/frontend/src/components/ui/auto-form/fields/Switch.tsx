import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@filigran/design-system';
import type { ComponentProps } from 'react';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormSwitch = ({
  label,
  isRequired,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  return (
    <FormItem>
      <div className="flex items-center gap-3">
        <FormControl>
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            {...(fieldProps as ComponentProps<typeof Switch>)}
          />
        </FormControl>
        <FormLabel required={isRequired}>
          {fieldConfigItem?.label || label}
        </FormLabel>
      </div>
    </FormItem>
  );
};

export default AutoFormSwitch;
