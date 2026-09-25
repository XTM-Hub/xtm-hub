import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import * as z from 'zod';
import { INPUT_COMPONENTS } from './config';

export type FieldConfigItem = {
  description?: React.ReactNode;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
      showLabel?: boolean;
      popoverContentClassName?: string;
    };
  label?: string;
  fieldType?:
    | keyof typeof INPUT_COMPONENTS
    | ((props: AutoFormInputComponentProps) => React.ReactElement | null);

  renderParent?: (props: {
    children: React.ReactNode;
  }) => React.ReactElement | null;

  order?: number;
};

export type FieldConfig<SchemaType extends z.infer<z.ZodObject>> = {
  // If SchemaType.key is an object, create a nested FieldConfig, otherwise FieldConfigItem
  [Key in keyof SchemaType]?: SchemaType[Key] extends object
    ? FieldConfig<z.infer<SchemaType[Key]>>
    : FieldConfigItem;
};

export enum DependencyType {
  DISABLES,
  REQUIRES,
  HIDES,
  SETS_OPTIONS,
}

type BaseDependency<SchemaType extends z.infer<z.ZodObject>> = {
  sourceField: keyof SchemaType;
  type: DependencyType;
  targetField: keyof SchemaType;
  when: (sourceFieldValue: unknown, targetFieldValue: unknown) => boolean;
};

export type ValueDependency<SchemaType extends z.infer<z.ZodObject>> =
  BaseDependency<SchemaType> & {
    type:
      DependencyType.DISABLES | DependencyType.REQUIRES | DependencyType.HIDES;
  };

export type EnumValues = readonly [string, ...string[]];

export type OptionsDependency<SchemaType extends z.infer<z.ZodObject>> =
  BaseDependency<SchemaType> & {
    type: DependencyType.SETS_OPTIONS;

    // Partial array of values from sourceField that will trigger the dependency
    options: EnumValues;
  };

export type Dependency<SchemaType extends z.infer<z.ZodObject>> =
  ValueDependency<SchemaType> | OptionsDependency<SchemaType>;

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

export type IntlTranslateFunction = (
  key: string,
  values?: Record<string, string | number | Date> | undefined
) => string;
