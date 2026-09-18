import React from 'react';
import type { DefaultValues } from 'react-hook-form';
import { z } from 'zod';
import type { FieldConfig } from './types';

export type ZodObjectOrWrapped =
  z.ZodObject<any, any> | z.ZodType<any, any, any>;

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

  const def = (schema as any)._def;

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

  if ((baseSchema as any)._def?.typeName === 'object') {
    return (baseSchema as z.ZodObject<any, any>).shape;
  }

  return null;
}

/**
 * Get the type name of the lowest level Zod type.
 * This will unpack optionals, refinements, etc.
 */
export function getBaseType(schema: z.ZodTypeAny): string {
  const baseSchema = getBaseSchema(schema);
  return baseSchema ? (baseSchema as any)._def.type : '';
}

/**
 * Search for a "ZodDefault" in the Zod stack and return its value.
 */
export function getDefaultValueInZodStack(schema: z.ZodTypeAny): any {
  const def = (schema as any)._def;

  if (def.typeName === 'ZodDefault') {
    return def.defaultValue();
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
export function getDefaultValues<Schema extends z.ZodObject<any, any>>(
  schema: Schema,
  fieldConfig?: FieldConfig<z.infer<Schema>>
): DefaultValues<Partial<z.infer<Schema>>> | null {
  if (!schema) return null;

  const shape = extractShape(schema);
  const defaultValues: any = {};

  if (!shape) return defaultValues;

  for (const key of Object.keys(shape)) {
    const item = shape[key] as z.ZodTypeAny;

    if (getBaseType(item) === 'ZodObject') {
      const nestedDefaults = getDefaultValues(
        getBaseSchema(item) as unknown as z.ZodObject<any, any>,
        fieldConfig?.[key] as FieldConfig<any> | undefined
      );

      if (nestedDefaults !== null) {
        for (const [nestedKey, nestedValue] of Object.entries(nestedDefaults)) {
          defaultValues[`${key}.${nestedKey}`] = nestedValue;
        }
      }
    } else {
      let defaultValue = getDefaultValueInZodStack(item);
      if (
        (defaultValue === null || defaultValue === '') &&
        fieldConfig?.[key]?.inputProps
      ) {
        defaultValue = (fieldConfig?.[key]?.inputProps as unknown as any)
          .defaultValue;
      }
      if (defaultValue !== undefined) {
        defaultValues[key] = defaultValue;
      }
    }
  }

  return defaultValues;
}

/**
 * Get the underlying ZodObject from a potentially wrapped schema
 */
export function getObjectFormSchema(
  schema: ZodObjectOrWrapped
): z.ZodObject<any, any> {
  const def = (schema as any)._def;

  // Recursively unwrap ZodEffects
  if (def.typeName === 'ZodEffects') {
    return getObjectFormSchema(def.schema);
  }

  return schema as z.ZodObject<any, any>;
}

/**
 * Convert a Zod schema to HTML input props to give direct feedback to the user.
 * Once submitted, the schema will be validated completely.
 */
export function zodToHtmlInputProps(
  schema: z.ZodTypeAny
): React.InputHTMLAttributes<HTMLInputElement> {
  const def = (schema as any)._def;

  // Handle ZodPipeline (z.coerce)
  if (def.typeName === 'ZodPipeline') {
    return zodToHtmlInputProps(def.out);
  }

  // Handle Optional and Nullable types
  if (['optional', 'nullable'].includes(def.type)) {
    return {
      ...zodToHtmlInputProps(def.innerType),
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
    for (const check of def.checks as any[]) {
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
export function sortFieldsByOrder<SchemaType extends z.ZodObject<any, any>>(
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
  return (schema as any)._def.typeName === 'ZodEffects';
}

/**
 * Unwrap all effects from a schema
 */
export function unwrapEffects<T extends z.ZodTypeAny>(schema: T): T {
  const def = (schema as any)._def;
  if (def.typeName === 'ZodEffects') {
    return unwrapEffects(def.schema);
  }
  return schema;
}
