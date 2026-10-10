import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FormField } from '@/components/ui/form';
import { useFormContext } from 'react-hook-form';
import * as z from 'zod';
import { DEFAULT_ZOD_HANDLERS, INPUT_COMPONENTS } from './config';
import type { FieldConfig, FieldConfigItem } from './types';
import {
  beautifyObjectName,
  getBaseSchema,
  getBaseType,
  getZodDef,
  type ZodObjectOrWrapped,
  zodToHtmlInputProps,
} from './utils';

const AutoFormObject = ({
  schema,
  fieldConfig,
  path = [],
}: {
  schema: ZodObjectOrWrapped;
  fieldConfig?: FieldConfig<Record<string, unknown>>;
  path?: string[];
}) => {
  const { control } = useFormContext();

  if (!schema) {
    return null;
  }

  const baseSchema = getBaseSchema(schema);
  const shape = (baseSchema as z.ZodObject | null)?.shape;

  if (!shape) {
    return null;
  }

  const formatItemName = (item: z.ZodAny, name: string) =>
    getZodDef(item).description ?? beautifyObjectName(name);

  return (
    <Accordion
      type="multiple"
      className="space-y-5">
      {Object.keys(shape).map((name) => {
        const item = shape[name] as z.ZodAny;
        const zodBaseType = getBaseType(item);
        const key = [...path, name].join('.');

        if (zodBaseType === 'array') {
          const fieldConfigItem: FieldConfigItem = fieldConfig?.[name] ?? {};
          const FieldType = fieldConfigItem.fieldType;

          if (typeof FieldType !== 'function') {
            return null;
          }

          const zodInputProps = zodToHtmlInputProps(item);

          return (
            <FormField
              control={control}
              name={key}
              key={key}
              render={({ field }) => {
                const fieldProps = {
                  ...field,
                  ...fieldConfigItem.inputProps,
                  disabled: fieldConfigItem.inputProps?.disabled ?? false,
                  ref: undefined,
                  value:
                    field.value ??
                    fieldConfigItem.inputProps?.defaultValue ??
                    [],
                };
                return (
                  <FieldType
                    field={field}
                    fieldConfigItem={fieldConfigItem}
                    label={key}
                    isRequired={fieldConfigItem.inputProps?.required ?? false}
                    zodItem={item}
                    fieldProps={fieldProps}
                    zodInputProps={zodInputProps}
                  />
                );
              }}
            />
          );
        }

        const itemName = formatItemName(item, name);

        if (zodBaseType === 'object') {
          return (
            <AccordionItem
              value={name}
              key={key}>
              <AccordionTrigger>{itemName}</AccordionTrigger>
              <AccordionContent className="p-2">
                <AutoFormObject
                  schema={item as unknown as z.ZodObject}
                  fieldConfig={
                    (fieldConfig?.[name] ?? {}) as FieldConfig<
                      Record<string, unknown>
                    >
                  }
                  path={[...path, name]}
                />
              </AccordionContent>
            </AccordionItem>
          );
        }

        const fieldConfigItem: FieldConfigItem = fieldConfig?.[name] ?? {};
        const zodInputProps = zodToHtmlInputProps(item);
        const isRequired =
          zodInputProps.required ||
          fieldConfigItem.inputProps?.required ||
          false;

        return (
          <FormField
            control={control}
            name={key}
            key={key}
            render={({ field }) => {
              const inputType =
                fieldConfigItem.fieldType ??
                DEFAULT_ZOD_HANDLERS[zodBaseType] ??
                'fallback';

              const InputComponent =
                typeof inputType === 'function'
                  ? inputType
                  : INPUT_COMPONENTS[inputType];

              const defaultValue = fieldConfigItem.inputProps?.defaultValue;
              const value = field.value ?? defaultValue ?? '';

              const fieldProps = {
                ...zodInputProps,
                ...field,
                ...fieldConfigItem.inputProps,
                disabled: fieldConfigItem.inputProps?.disabled ?? false,
                ref: undefined,
                value: value,
              };

              if (InputComponent === undefined) {
                return <></>;
              }

              return (
                <InputComponent
                  zodInputProps={zodInputProps}
                  field={field}
                  fieldConfigItem={fieldConfigItem}
                  label={itemName}
                  isRequired={isRequired}
                  zodItem={item}
                  fieldProps={fieldProps}
                  className={fieldProps.className}
                />
              );
            }}
          />
        );
      })}
    </Accordion>
  );
};

export default AutoFormObject;
