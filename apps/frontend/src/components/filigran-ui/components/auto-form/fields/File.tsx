import {
  FileInput,
  FormControl,
  FormItem,
  FormMessage,
} from '@/components/filigran-ui/components/clients';
import type { ComponentProps } from 'react';
import AutoFormLabel from '../common/Label';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormFile = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const {
    showLabel: _showLabel,
    required: _required,
    ...fieldPropsWithoutShowLabel
  } = fieldProps;
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
        <FileInput
          {...(fieldPropsWithoutShowLabel as unknown as ComponentProps<
            typeof FileInput
          >)}
        />
      </FormControl>

      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
};

export default AutoFormFile;
