import {
  FormControl,
  FormItem,
} from '@/components/filigran-ui/components/clients';
import { Switch } from '@/components/filigran-ui/components/clients/Switch';
import type { ComponentProps } from 'react';
import AutoFormLabel from '../common/Label';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormSwitch = ({
  label,
  isRequired,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  return (
    <div>
      <FormItem>
        <div className="flex items-center gap-3">
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              {...(fieldProps as ComponentProps<typeof Switch>)}
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

export default AutoFormSwitch;
