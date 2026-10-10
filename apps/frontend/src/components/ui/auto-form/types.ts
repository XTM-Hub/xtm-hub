import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import * as z from 'zod';
import type { INPUT_COMPONENTS } from './config';

export type FieldConfigItem = {
  inputProps?: React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  label?: string;
  fieldType?:
    | keyof typeof INPUT_COMPONENTS
    | ((props: AutoFormInputComponentProps) => React.ReactElement | null);
};

export type FieldConfig<SchemaType extends z.infer<z.ZodObject>> = {
  // If SchemaType.key is an object, create a nested FieldConfig, otherwise FieldConfigItem
  [Key in keyof SchemaType]?: SchemaType[Key] extends object
    ? FieldConfig<z.infer<SchemaType[Key]>>
    : FieldConfigItem;
};

/**
 * A FormInput component can handle a specific Zod type (e.g. "ZodBoolean")
 */
export type AutoFormInputComponentProps = {
  zodInputProps: React.InputHTMLAttributes<HTMLInputElement>;
  field: ControllerRenderProps<FieldValues>;
  fieldConfigItem: FieldConfigItem;
  label: string;
  isRequired: boolean;
  // Field-specific props determined dynamically by the resolved field type
  // (input, select, checkbox, radio group, etc.) at runtime; each consuming
  // field component knows the concrete shape it needs and casts accordingly.
  fieldProps: Record<string, unknown>;
  zodItem: z.ZodAny;
  className?: string;
};
