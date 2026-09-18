import { Select } from '@radix-ui/react-select';
import * as z from 'zod';
import {
  FormControl,
  FormItem,
  FormMessage,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../clients';
import AutoFormLabel from '../common/label';
import AutoFormTooltip from '../common/tooltip';
import type { AutoFormInputComponentProps } from '../types';
import { getBaseSchema } from '../utils';

export default function AutoFormEnum({
  label,
  isRequired,
  field,
  fieldConfigItem,
  zodItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const baseSchema = getBaseSchema(zodItem) as unknown as typeof z.enum<any>;

  let values: [string, string][] = [];
  if (baseSchema) {
    const def = (baseSchema as any)._def;

    if (def.type === 'enum' && def.entries) {
      const baseValues = def.entries;

      if (!Array.isArray(baseValues)) {
        values = Object.entries(baseValues);
      } else {
        values = baseValues.map((value: string) => [value, value]);
      }
    }
  }

  function findItem(value: any) {
    return values.find((item) => item[0] === value);
  }

  const { popoverContentClassName, ...selectFieldProps } = fieldProps;

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
          {...selectFieldProps}>
          <SelectTrigger className={selectFieldProps.className}>
            <SelectValue placeholder={fieldConfigItem.inputProps?.placeholder}>
              {field.value ? findItem(field.value)?.[1] : 'Select an option'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={popoverContentClassName}>
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
}
