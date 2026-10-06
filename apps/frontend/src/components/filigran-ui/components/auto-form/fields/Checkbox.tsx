import {
  FormControl,
  FormItem,
} from '@/components/filigran-ui/components/clients';
import { Checkbox } from '@filigran/design-system';
import type { ComponentProps } from 'react';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormCheckbox = ({
  label,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  return (
    <div>
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
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </div>
  );
};

export default AutoFormCheckbox;
