import {
  FormControl,
  FormItem,
  FormMessage,
} from '@/components/filigran-ui/components/clients';
import { Input } from '@/components/filigran-ui/components/servers';
import type { ComponentProps } from 'react';
import AutoFormLabel from '../common/Label';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormNumber = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const { showLabel: _showLabel, ...fieldPropsWithoutShowLabel } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;

  return (
    <FormItem>
      {showLabel && (
        <AutoFormLabel
          label={fieldConfigItem?.label || label}
          isRequired={isRequired}
        />
      )}
      <FormControl>
        <Input
          type="number"
          {...(fieldPropsWithoutShowLabel as ComponentProps<typeof Input>)}
        />
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
};

export default AutoFormNumber;
