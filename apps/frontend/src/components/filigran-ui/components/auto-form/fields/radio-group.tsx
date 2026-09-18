import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  RadioGroup,
  RadioGroupItem,
} from '../../clients';
import AutoFormLabel from '../common/label';
import AutoFormTooltip from '../common/tooltip';
import type { AutoFormInputComponentProps } from '../types';
import { getBaseSchema } from '../utils';

export default function AutoFormRadioGroup({
  label,
  isRequired,
  field,
  zodItem,
  fieldProps,
  fieldConfigItem,
}: AutoFormInputComponentProps) {
  const baseSchema = getBaseSchema(zodItem);
  let values: string[] = [];

  if (baseSchema) {
    const def = (baseSchema as any)._def;
    const enumValues = def.entries ?? def.values;
    const isEnumType =
      def.type === 'enum' ||
      def.type === 'nativeEnum' ||
      def.typeName === 'enum' ||
      def.typeName === 'nativeEnum';

    if (isEnumType && enumValues) {
      if (Array.isArray(enumValues)) {
        values = enumValues;
      } else {
        values = Object.values(enumValues)
          .filter((value) => typeof value === 'string')
          .filter((value, index, array) => array.indexOf(value) === index);
      }
    }
  }

  return (
    <div>
      <FormItem>
        <AutoFormLabel
          label={fieldConfigItem?.label || label}
          isRequired={isRequired}
        />
        <FormControl>
          <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
            {...fieldProps}>
            {values?.map((value: any) => (
              <FormItem
                key={value}
                className="flex flex-row items-center gap-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value={value} />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">
                  {value}
                </FormLabel>
              </FormItem>
            ))}
          </RadioGroup>
        </FormControl>
        <FormMessage />
      </FormItem>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </div>
  );
}
