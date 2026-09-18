import React from 'react';
import type { DefaultValues } from 'react-hook-form';
import { z } from 'zod';
import type { FieldConfig, FieldConfigItem } from './types';

// AutoForm's `SchemaType extends ZodObjectOrWrapped` generic bound relies on
// `any` here so TypeScript infers the concrete schema type passed by each
// caller (e.g. `AutoForm<typeof mySchema>`), instead of collapsing to a
// generic `unknown`-based ZodObject/ZodType that would break `z.infer`
// downstream throughout AutoForm.tsx and its field renderers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ZodObjectOrWrapped =
  z.ZodObject<any, any> | z.ZodType<any, any, any>;

/**
 * Zod schemas expose their internal definition via `_def`, but its shape
 * isn't part of the public type surface. This describes only the fields
 * this file actually reads off of it while walking the Zod stack.
 */
export type ZodInternalDef = {
  typeName?: string;
  type?: string;
  schema?: z.ZodTypeAny;
  out?: z.ZodTypeAny;
  innerType?: z.ZodTypeAny;
  defaultValue?: () => unknown;
  description?: string;
  entries?: Record<string, string> | string[];
  values?: Record<string, string> | string[];
  checks?: Array<{
    kind?: string;
    value?: number;
    regex?: RegExp;
  }>;
};

export const getZodDef = (schema: z.ZodTypeAny): ZodInternalDef =>
  (schema as unknown as { _def: ZodInternalDef })._def;

/**
 * Beautify a camelCase string.
 * e.g. "myString" -> "My String"
 */
export function beautifyObjectName(string: string) {
  // if numbers only return the string
  let output = string.replace(/([A-Z])/g, ' $1');
  output = output.charAt(0).toUpperCase() + output.slice(1);
  return output;
}

/**
 * Get the lowest level Zod type.
 * This will unpack optionals, refinements, etc.
 */
export function getBaseSchema<ChildType extends z.ZodTypeAny = z.ZodTypeAny>(
  schema: ChildType
): ChildType | null {
  if (!schema) return null;

  const def = getZodDef(schema);

  if (def.typeName === 'effects') {
    return getBaseSchema(def.schema as ChildType);
  }
  if (def.typeName === 'pipeline') {
    return getBaseSchema(def.out as ChildType);
  }
  if ('innerType' in def) {
    return getBaseSchema(def.innerType as ChildType);
  }

  return schema as ChildType;
}

/**
 * Extract the shape from a Zod schema (handling effects and other wrappers)
 */
export function extractShape(
  schema: z.ZodTypeAny
): Record<string, z.ZodTypeAny> | null {
  const baseSchema = getBaseSchema(schema);

  if (!baseSchema) return null;

  if (getZodDef(baseSchema)?.typeName === 'object') {
    return (baseSchema as z.ZodObject).shape;
  }

  return null;
}

/**
 * Get the type name of the lowest level Zod type.
 * This will unpack optionals, refinements, etc.
 */
export function getBaseType(schema: z.ZodTypeAny): string {
  const baseSchema = getBaseSchema(schema);
  return baseSchema ? (getZodDef(baseSchema).type ?? '') : '';
}

/**
 * Search for a "ZodDefault" in the Zod stack and return its value.
 */
export function getDefaultValueInZodStack(schema: z.ZodTypeAny): unknown {
  const def = getZodDef(schema);

  if (def.typeName === 'ZodDefault') {
    return def.defaultValue?.();
  }

  if (def.typeName === 'ZodEffects') {
    return getDefaultValueInZodStack(def.schema as z.ZodTypeAny);
  }

  if ('innerType' in def) {
    return getDefaultValueInZodStack(def.innerType as z.ZodTypeAny);
  }

  return undefined;
}

/**
 * Get all default values from a Zod schema.
 */
export function getDefaultValues<Schema extends z.ZodObject>(
  schema: Schema,
  fieldConfig?: FieldConfig<z.infer<Schema>>
): DefaultValues<Partial<z.infer<Schema>>> | null {
  if (!schema) return null;

  const shape = extractShape(schema);
  const defaultValues: Record<string, unknown> = {};

  if (!shape) return defaultValues as DefaultValues<Partial<z.infer<Schema>>>;

  for (const key of Object.keys(shape)) {
    const item = shape[key] as z.ZodTypeAny;

    if (getBaseType(item) === 'ZodObject') {
      const nestedDefaults = getDefaultValues(
        getBaseSchema(item) as unknown as z.ZodObject,
        fieldConfig?.[key] as FieldConfig<Record<string, unknown>> | undefined
      );

      if (nestedDefaults !== null) {
        for (const [nestedKey, nestedValue] of Object.entries(nestedDefaults)) {
          defaultValues[`${key}.${nestedKey}`] = nestedValue;
        }
      }
    } else {
      let defaultValue = getDefaultValueInZodStack(item);
      const fieldConfigItem = fieldConfig?.[key] as FieldConfigItem | undefined;
      if (
        (defaultValue === null || defaultValue === '') &&
        fieldConfigItem?.inputProps
      ) {
        defaultValue = fieldConfigItem.inputProps.defaultValue;
      }
      if (defaultValue !== undefined) {
        defaultValues[key] = defaultValue;
      }
    }
  }

  return defaultValues as DefaultValues<Partial<z.infer<Schema>>>;
}

/**
 * Get the underlying ZodObject from a potentially wrapped schema
 */
export function getObjectFormSchema(schema: ZodObjectOrWrapped): z.ZodObject {
  const def = getZodDef(schema as z.ZodTypeAny);

  // Recursively unwrap ZodEffects
  if (def.typeName === 'ZodEffects') {
    return getObjectFormSchema(def.schema as ZodObjectOrWrapped);
  }

  return schema as z.ZodObject;
}

/**
 * Convert a Zod schema to HTML input props to give direct feedback to the user.
 * Once submitted, the schema will be validated completely.
 */
export function zodToHtmlInputProps(
  schema: z.ZodTypeAny
): React.InputHTMLAttributes<HTMLInputElement> {
  const def = getZodDef(schema);

  // Handle ZodPipeline (z.coerce)
  if (def.typeName === 'ZodPipeline') {
    return zodToHtmlInputProps(def.out as z.ZodTypeAny);
  }

  // Handle Optional and Nullable types
  if (def.type && ['optional', 'nullable'].includes(def.type)) {
    return {
      ...zodToHtmlInputProps(def.innerType as z.ZodTypeAny),
      required: false,
    };
  }

  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
    required: true,
  };

  const baseType = getBaseType(schema);

  // Set input type based on Zod type
  if (baseType === 'number') {
    inputProps.type = 'number';
  }

  // Handle checks (min, max, email, url, etc.)
  if (def.checks && Array.isArray(def.checks)) {
    for (const check of def.checks) {
      switch (check.kind) {
        case 'min':
          if (baseType === 'string') {
            inputProps.minLength = check.value;
          } else if (baseType === 'number') {
            inputProps.min = check.value;
          }
          break;

        case 'max':
          if (baseType === 'string') {
            inputProps.maxLength = check.value;
          } else if (baseType === 'number') {
            inputProps.max = check.value;
          }
          break;

        case 'email':
          inputProps.type = 'email';
          break;

        case 'url':
          inputProps.type = 'url';
          break;

        case 'regex':
          if (check.regex) {
            inputProps.pattern = check.regex.source;
          }
          break;

        case 'int':
          inputProps.step = '1';
          break;

        case 'multipleOf':
          if (baseType === 'number' && check.value) {
            inputProps.step = String(check.value);
          }
          break;
      }
    }
  }

  return inputProps;
}

/**
 * Sort the fields by order.
 * If no order is set, the field will be sorted based on the order in the schema.
 */
export function sortFieldsByOrder<SchemaType extends z.ZodObject>(
  fieldConfig: FieldConfig<z.infer<SchemaType>> | undefined,
  keys: string[]
): string[] {
  return keys.sort((a, b) => {
    const fieldA = (fieldConfig?.[a]?.order as number) ?? 0;
    const fieldB = (fieldConfig?.[b]?.order as number) ?? 0;
    return fieldA - fieldB;
  });
}

/**
 * Check if a schema has effects (transformations)
 */
export function hasEffects(schema: z.ZodTypeAny): boolean {
  return getZodDef(schema).typeName === 'ZodEffects';
}

/**
 * Unwrap all effects from a schema
 */
export function unwrapEffects<T extends z.ZodTypeAny>(schema: T): T {
  const def = getZodDef(schema);
  if (def.typeName === 'ZodEffects') {
    return unwrapEffects(def.schema as T);
  }
  return schema;
}
