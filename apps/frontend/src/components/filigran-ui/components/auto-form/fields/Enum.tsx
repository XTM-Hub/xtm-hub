import {
  FormControl,
  FormItem,
  FormMessage,
} from '@/components/filigran-ui/components/clients';
import { cn } from '@/components/filigran-ui/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import type { ComponentProps } from 'react';
import AutoFormLabel from '../common/Label';
import AutoFormTooltip from '../common/Tooltip';
import type { AutoFormInputComponentProps } from '../types';
import { getBaseSchema, getZodDef } from '../utils';

const AutoFormEnum = ({
  label,
  isRequired,
  field,
  fieldConfigItem,
  zodItem,
  fieldProps,
}: AutoFormInputComponentProps) => {
  const baseSchema = getBaseSchema(zodItem);

  let values: [string, string][] = [];
  if (baseSchema) {
    const def = getZodDef(baseSchema);

    if (def.type === 'enum' && def.entries) {
      const baseValues = def.entries;

      if (!Array.isArray(baseValues)) {
        values = Object.entries(baseValues);
      } else {
        values = baseValues.map((value: string) => [value, value]);
      }
    }
  }

  function findItem(value: string) {
    return values.find((item) => item[1] === value);
  }

  const { popoverContentClassName, ...selectFieldProps } = fieldProps;
  const noSelectionLabel =
    fieldConfigItem.inputProps?.placeholder ?? 'Select an option';

  return (
    <FormItem>
      <AutoFormLabel
        label={fieldConfigItem?.label || label}
        isRequired={isRequired}
      />
      <FormControl>
        <Select
          onValueChange={field.onChange}
          defaultValue={field.value}
          // Field props are an untyped record; Partial because the children
          // come from the JSX below while the root types them as required.
          {...(selectFieldProps as Partial<ComponentProps<typeof Select>>)}>
          <SelectTrigger
            aria-label={fieldConfigItem?.label || label}
            className={cn(
              'w-full',
              selectFieldProps.className as string | undefined
            )}>
            <SelectValue placeholder={fieldConfigItem.inputProps?.placeholder}>
              {field.value ? findItem(field.value)?.[1] : noSelectionLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            className={popoverContentClassName as string | undefined}>
            {values.map(([value, label]) => (
              <SelectItem
                value={label}
                key={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
};

export default AutoFormEnum;
