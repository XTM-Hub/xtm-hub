import { FormItem, useFormField } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectHelperText,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import type { ComponentProps } from 'react';
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
  const { error } = useFormField();
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

  const noSelectionLabel =
    fieldConfigItem.inputProps?.placeholder ?? 'Select an option';

  return (
    <FormItem>
      {/* The root renders no element: this div keeps its parts together
          inside the item's gap. */}
      <div>
        <Select
          onValueChange={field.onChange}
          defaultValue={field.value}
          // Field props are an untyped record; Partial because the children
          // come from the JSX below while the root types them as required.
          {...(fieldProps as Partial<ComponentProps<typeof Select>>)}
          error={Boolean(error)}>
          <SelectLabel required={isRequired}>
            {fieldConfigItem?.label || label}
          </SelectLabel>
          <SelectTrigger
            className={cn(
              'w-full',
              fieldProps.className as string | undefined
            )}>
            <SelectValue placeholder={fieldConfigItem.inputProps?.placeholder}>
              {field.value ? findItem(field.value)?.[1] : noSelectionLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {values.map(([value, label]) => (
              <SelectItem
                value={label}
                key={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
          {error && <SelectHelperText>{error.message}</SelectHelperText>}
        </Select>
      </div>
    </FormItem>
  );
};

export default AutoFormEnum;
