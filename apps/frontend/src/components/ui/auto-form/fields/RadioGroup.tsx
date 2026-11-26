import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Radio, RadioGroup } from '@filigran/design-system';
import type { ComponentProps } from 'react';
import type { AutoFormInputComponentProps } from '../types';
import { getBaseSchema, getZodDef } from '../utils';

const AutoFormRadioGroup = ({
  label,
  isRequired,
  field,
  zodItem,
  fieldProps,
  fieldConfigItem,
}: AutoFormInputComponentProps) => {
  const baseSchema = getBaseSchema(zodItem);
  let values: string[] = [];

  if (baseSchema) {
    const def = getZodDef(baseSchema);
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

  const text = fieldConfigItem?.label || label;

  return (
    <FormItem>
      <FormLabel required={isRequired}>{text}</FormLabel>
      <FormControl>
        <RadioGroup
          orientation="horizontal"
          className="flex-wrap"
          aria-label={text}
          onValueChange={field.onChange}
          defaultValue={field.value}
          {...(fieldProps as ComponentProps<typeof RadioGroup>)}>
          {values?.map((value: string) => (
            <Radio
              key={value}
              value={value}
              label={value}
              disabled={Boolean(fieldProps.disabled)}
            />
          ))}
        </RadioGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

export default AutoFormRadioGroup;
