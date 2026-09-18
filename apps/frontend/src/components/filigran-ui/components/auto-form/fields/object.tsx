import { useForm, useFormContext } from 'react-hook-form';
import * as z from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  FormField,
} from '../../clients';
import { DEFAULT_ZOD_HANDLERS, INPUT_COMPONENTS } from '../config';
import resolveDependencies from '../dependencies';
import type {
  Dependency,
  FieldConfig,
  FieldConfigItem,
  IntlTranslateFunction,
} from '../types';
import {
  beautifyObjectName,
  getBaseSchema,
  getBaseType,
  sortFieldsByOrder,
  zodToHtmlInputProps,
} from '../utils';

function DefaultParent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function AutoFormObject<
  SchemaType extends z.ZodObject<any, any>,
>({
  schema,
  form,
  fieldConfig,
  path = [],
  dependencies = [],
  intlTranslation,
}: {
  schema: SchemaType | z.ZodType<any, any, any>;
  form: ReturnType<typeof useForm>;
  fieldConfig?: FieldConfig<z.infer<SchemaType>>;
  path?: string[];
  dependencies?: Dependency<z.infer<SchemaType>>[];
  intlTranslation?: IntlTranslateFunction;
}) {
  const { watch, control } = useFormContext();

  if (!schema) {
    return null;
  }

  const baseSchema = getBaseSchema(schema);
  const shape = (baseSchema as z.ZodObject<any, any> | null)?.shape;

  if (!shape) {
    return null;
  }

  const processSchemaItem = (item: z.ZodAny) => {
    return item;
  };

  const sortedFieldKeys = sortFieldsByOrder(fieldConfig, Object.keys(shape));

  const formatItemName = (item: z.ZodAny, name: string) => {
    const def = (item as any)._def;
    const description = def.description;
    if (def.type === 'array') {
      return 'Array not supported yet :) ';
    }

    if (intlTranslation) {
      try {
        return intlTranslation(description ?? name);
      } catch (error) {
        // If translation fails, fall back to the description
        return description ?? beautifyObjectName(name);
      }
    }
    return description ?? beautifyObjectName(name);
  };

  return (
    <Accordion
      type="multiple"
      className="space-y-5 border-none">
      {sortedFieldKeys.map((name) => {
        let item = shape[name] as z.ZodAny;
        item = processSchemaItem(item);

        const zodBaseType = getBaseType(item);
        const itemName = formatItemName(item, name);
        const key = [...path, name].join('.');

        const {
          isHidden,
          isDisabled,
          isRequired: isRequiredByDependency,
          overrideOptions,
        } = resolveDependencies(dependencies, name, watch);
        if (isHidden) {
          return null;
        }

        if (zodBaseType === 'array') {
          const fieldConfigItem: FieldConfigItem = fieldConfig?.[name] ?? {};

          if (fieldConfigItem.fieldType) {
            const FieldType = fieldConfigItem.fieldType;
            const zodInputProps = zodToHtmlInputProps(item);

            return (
              <FormField
                control={control}
                name={key}
                key={key}
                render={({ field }) => {
                  if (typeof FieldType === 'function') {
                    const fieldProps = {
                      ...field,
                      ...fieldConfigItem.inputProps,
                      disabled:
                        fieldConfigItem.inputProps?.disabled || isDisabled,
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
                        isRequired={
                          fieldConfigItem.inputProps?.required ?? false
                        }
                        zodItem={item}
                        fieldProps={fieldProps}
                        zodInputProps={zodInputProps}
                      />
                    );
                  }

                  return (
                    <input
                      type={FieldType}
                      {...field}
                    />
                  );
                }}
              />
            );
          }

          return (
            <div key={key}>
              <label className="font-bold">{itemName}</label>
              <br />
              {'Array not implemented yet. Define it manually in fieldConfig.'}
            </div>
          );
        }

        if (zodBaseType === 'object') {
          return (
            <AccordionItem
              value={name}
              key={key}
              className="border-none">
              <AccordionTrigger>{itemName}</AccordionTrigger>
              <AccordionContent className="p-2">
                <AutoFormObject
                  schema={item as unknown as z.ZodObject<any, any>}
                  form={form}
                  fieldConfig={
                    (fieldConfig?.[name] ?? {}) as FieldConfig<
                      z.infer<typeof item>
                    >
                  }
                  path={[...path, name]}
                />
              </AccordionContent>
            </AccordionItem>
          );
        }

        // Not implemented yet
        // if (zodBaseType === "ZodArray") {
        //   return (
        //     <AutoFormArray
        //       key={key}
        //       name={name}
        //       item={item as unknown as z.ZodArray<any>}
        //       form={form}
        //       fieldConfig={fieldConfig?.[name] ?? {}}
        //       path={[...path, name]}
        //     />
        //   );
        // }

        const fieldConfigItem: FieldConfigItem = fieldConfig?.[name] ?? {};
        const zodInputProps = zodToHtmlInputProps(item);
        const isRequired =
          isRequiredByDependency ||
          zodInputProps.required ||
          fieldConfigItem.inputProps?.required ||
          false;

        if (overrideOptions) {
          item = z.enum(
            overrideOptions as [string, ...string[]]
          ) as unknown as z.ZodAny;
        }
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

              const ParentElement =
                fieldConfigItem.renderParent ?? DefaultParent;

              const defaultValue = fieldConfigItem.inputProps?.defaultValue;
              const value = field.value ?? defaultValue ?? '';

              const fieldProps = {
                ...zodToHtmlInputProps(item),
                ...field,
                ...fieldConfigItem.inputProps,
                disabled: fieldConfigItem.inputProps?.disabled || isDisabled,
                ref: undefined,
                value: value,
              };

              if (InputComponent === undefined) {
                return <></>;
              }

              return (
                <ParentElement key={`${key}.parent`}>
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
                </ParentElement>
              );
            }}
          />
        );
      })}
    </Accordion>
  );
}
