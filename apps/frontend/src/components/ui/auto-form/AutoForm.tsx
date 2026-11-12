'use client';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useEffect, useMemo } from 'react';
import {
  type DefaultValues,
  type FormState,
  useForm,
  type UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';
import AutoFormObject from './AutoFormObject';
import type { FieldConfig } from './types';
import {
  getDefaultValues,
  getObjectFormSchema,
  type ZodObjectOrWrapped,
} from './utils';

export type AutoFormProps<SchemaType extends ZodObjectOrWrapped> = {
  formSchema: SchemaType;
  values?: z.infer<SchemaType>;
  onValuesChange?: (
    values: Partial<z.infer<SchemaType>>,
    form: UseFormReturn<z.infer<SchemaType>>
  ) => void;
  onSubmit?: (
    values: z.infer<SchemaType>,
    form: UseFormReturn<z.infer<SchemaType>>
  ) => void;
  fieldConfig?: FieldConfig<z.infer<SchemaType>>;
  children?:
    ReactNode | ((formState: FormState<z.infer<SchemaType>>) => ReactNode);
  className?: string;
};

const AutoForm = <SchemaType extends ZodObjectOrWrapped>({
  formSchema,
  values: valuesProp,
  onValuesChange: onValuesChangeProp,
  onSubmit: onSubmitProp,
  fieldConfig,
  children,
  className,
}: AutoFormProps<SchemaType>) => {
  const objectFormSchema = getObjectFormSchema(formSchema);

  // Every field keeps a key in the values, even unset: react-hook-form compares
  // the keys, so a field registering one the values lack (a file field) makes
  // the form dirty before any edit. Memoized, as the values object is a
  // dependency of react-hook-form's reset effect.
  const values = useMemo(
    () =>
      valuesProp && {
        ...(Object.fromEntries(
          Object.keys(objectFormSchema.shape).map((key) => [key, undefined])
        ) as Partial<z.infer<SchemaType>>),
        ...valuesProp,
      },
    [objectFormSchema, valuesProp]
  );

  const defaultValues =
    getDefaultValues(
      objectFormSchema,
      fieldConfig as FieldConfig<Record<string, unknown>>
    ) ?? undefined;

  const form = useForm<z.infer<SchemaType>>({
    // zodResolver's generic Resolver<TFieldValues> can't be derived from the
    // caller-supplied SchemaType bound without collapsing useForm's own
    // generic inference (see ZodObjectOrWrapped for the same trade-off); the
    // cast keeps the resolver correctly wired at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: defaultValues as
      DefaultValues<z.infer<SchemaType>> | undefined,
    values,
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
    });

    return () => subscription.unsubscribe();
  }, [form, onValuesChangeProp]);

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
            schema={objectFormSchema as ZodObjectOrWrapped}
            fieldConfig={
              fieldConfig as FieldConfig<Record<string, unknown>> | undefined
            }
          />

          {renderChildren}
        </form>
      </Form>
    </div>
  );
};

export { AutoForm };
