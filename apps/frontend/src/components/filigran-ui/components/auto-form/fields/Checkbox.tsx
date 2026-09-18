import {
  Checkbox,
  FormControl,
  FormItem,
} from '@/components/filigran-ui/components/clients';
import type { ComponentProps } from 'react';
import AutoFormLabel from '../common/Label';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormCheckbox = ({
  label,
  isRequired,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  return (
    <div>
      <FormItem>
        <div className="mb-3 flex items-center gap-3">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              {...(fieldProps as ComponentProps<typeof Checkbox>)}
            />
          </FormControl>
          <AutoFormLabel
            label={fieldConfigItem?.label || label}
            isRequired={isRequired}
          />
        </div>
      </FormItem>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </div>
  );
};

export default AutoFormCheckbox;
