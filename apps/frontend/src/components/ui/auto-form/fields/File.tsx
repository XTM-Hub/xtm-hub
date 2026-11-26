import { FormItem, useFormField } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import {
  fromFileSelectValue,
  getFileSelectLabels,
  toFileSelectValue,
} from '@/utils/design-system/file-select';
import { FileSelect, type FileSelectProps } from '@filigran/design-system';
import type { AutoFormInputComponentProps } from '../types';

const AutoFormFile = ({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const t = useTranslate();
  const { error } = useFormField();
  const {
    required: _required,
    value,
    onChange,
    multiple,
    ...rest
  } = fieldProps;

  return (
    <FormItem>
      <FileSelect
        {...getFileSelectLabels(t)}
        label={fieldConfigItem?.label || label}
        required={isRequired}
        error={error?.message}
        {...(rest as FileSelectProps)}
        multiple={Boolean(multiple)}
        value={toFileSelectValue(value, Boolean(multiple))}
        onValueChange={(next) =>
          (onChange as (value: File[] | undefined) => void)(
            fromFileSelectValue(next)
          )
        }
      />
    </FormItem>
  );
};

export default AutoFormFile;
