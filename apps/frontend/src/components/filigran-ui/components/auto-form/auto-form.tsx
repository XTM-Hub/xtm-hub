'use client';
import {
  type DefaultValues,
  type FormState,
  useForm,
  type UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Form } from '../clients';
import { Button } from '../servers';
import AutoFormObject from './fields/object';
import type { Dependency, FieldConfig, IntlTranslateFunction } from './types';
import {
  getDefaultValues,
  getObjectFormSchema,
  type ZodObjectOrWrapped,
} from './utils';

const AutoFormSubmit = ({
  children,
  className,
  disabled,
}: {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) => {
  return (
    <Button
      type="submit"
      disabled={disabled}
      className={className}>
      {children ?? 'Submit'}
    </Button>
  );
};

const AutoForm = <SchemaType extends ZodObjectOrWrapped>({
  formSchema,
  values: valuesProp,
  onValuesChange: onValuesChangeProp,
  onParsedValuesChange,
  onSubmit: onSubmitProp,
  fieldConfig,
  children,
  className,
  dependencies,
  intlTranslation,
}: {
  formSchema: SchemaType;
  values?: z.infer<SchemaType>;
  onValuesChange?: (
    values: Partial<z.infer<SchemaType>>,
    form: UseFormReturn<z.infer<SchemaType>>
  ) => void;
  onParsedValuesChange?: (
    values: Partial<z.infer<SchemaType>>,
    form: UseFormReturn<z.infer<SchemaType>>
  ) => void;
  onSubmit?: (
    values: z.infer<SchemaType>,
    form: UseFormReturn<z.infer<SchemaType>>
  ) => void;
  fieldConfig?: FieldConfig<z.infer<SchemaType>>;
  children?:
    | React.ReactNode
    | ((formState: FormState<z.infer<SchemaType>>) => React.ReactNode);
  className?: string;
  dependencies?: Dependency<z.infer<SchemaType>>[];
  intlTranslation?: IntlTranslateFunction;
}) => {
  const objectFormSchema = getObjectFormSchema(formSchema);

  const defaultValues =
    getDefaultValues(objectFormSchema, fieldConfig as FieldConfig<any>) ??
    undefined;

  const form = useForm<z.infer<SchemaType>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: defaultValues as
      DefaultValues<z.infer<SchemaType>> | undefined,
    values: valuesProp,
  });

  function onSubmit(values: z.infer<SchemaType>) {
    const parsedValues = formSchema.safeParse(values);
    if (parsedValues.success) {
      onSubmitProp?.(parsedValues.data, form);
    }
  }

  useEffect(() => {
    const subscription = form.watch((values) => {
      onValuesChangeProp?.(values as Partial<z.infer<SchemaType>>, form);

      const parsedValues = formSchema.safeParse(values);
      if (parsedValues.success) {
        onParsedValuesChange?.(parsedValues.data, form);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, formSchema, onValuesChangeProp, onParsedValuesChange]);

  const renderChildren =
    typeof children === 'function'
      ? children(form.formState as FormState<z.infer<SchemaType>>)
      : children;

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            form.handleSubmit(onSubmit)(e);
          }}
          className={cn('space-y-5', className)}>
          <AutoFormObject
            schema={
              objectFormSchema as
                z.ZodObject<any, any> | z.ZodType<any, any, any>
            }
            form={form as any}
            dependencies={
              dependencies as Dependency<Record<string, unknown>>[] | undefined
            }
            fieldConfig={fieldConfig as FieldConfig<any>}
            intlTranslation={intlTranslation}
          />

          {renderChildren}
        </form>
      </Form>
    </div>
  );
};

export { AutoForm, AutoFormSubmit };
