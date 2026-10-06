import {
  FormControl,
  FormItem,
  FormMessage,
} from '@/components/filigran-ui/components/clients';
import { Radio, RadioGroup } from '@filigran/design-system';
import type { ComponentProps } from 'react';
import AutoFormLabel from '../common/Label';
import AutoFormTooltip from '../common/Tooltip';
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

  return (
    <div>
      <FormItem>
        <AutoFormLabel
          label={fieldConfigItem?.label || label}
          isRequired={isRequired}
        />
        <FormControl>
          <RadioGroup
            orientation="horizontal"
            className="flex-wrap"
            aria-label={fieldConfigItem?.label || label}
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
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </div>
  );
};

export default AutoFormRadioGroup;
