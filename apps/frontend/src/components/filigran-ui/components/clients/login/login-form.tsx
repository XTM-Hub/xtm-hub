'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '../../../lib/utils';
import { Button } from '../../servers/button';
import { Input } from '../../servers/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../form';
import type { LoginLabels } from './login-types';

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export interface LoginFormProps extends Omit<
  React.HTMLAttributes<HTMLFormElement>,
  'onSubmit'
> {
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
  onForgotPassword?: () => void;
  error?: string;
  labels?: Pick<
    LoginLabels,
    'emailLabel' | 'passwordLabel' | 'signInLabel' | 'forgotPasswordLabel'
  >;
  disabled?: boolean;
}

const LoginForm = React.forwardRef<HTMLFormElement, LoginFormProps>(
  (
    {
      className,
      onSubmit,
      onForgotPassword,
      error,
      labels,
      disabled,
      ...props
    },
    ref
  ) => {
    const form = useForm<LoginFormValues>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
        email: '',
        password: '',
      },
    });

    const handleSubmit = async (values: LoginFormValues) => {
      await onSubmit(values);
    };

    const emailLabel = labels?.emailLabel ?? 'Login';
    const passwordLabel = labels?.passwordLabel ?? 'Password';
    const signInLabel = labels?.signInLabel ?? 'Sign in';
    const forgotPasswordLabel =
      labels?.forgotPasswordLabel ?? 'I forgot my password';

    return (
      <Form {...form}>
        <form
          ref={ref}
          className={cn('flex flex-col gap-4', className)}
          onSubmit={form.handleSubmit(handleSubmit)}
          {...props}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{emailLabel}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={disabled}
                    autoComplete="username"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{passwordLabel}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    disabled={disabled}
                    autoComplete="current-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}

          <div className="flex items-center justify-between">
            {onForgotPassword ? (
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={onForgotPassword}>
                {forgotPasswordLabel}
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="submit"
              disabled={disabled || form.formState.isSubmitting}>
              {signInLabel}
            </Button>
          </div>
        </form>
      </Form>
    );
  }
);
LoginForm.displayName = 'LoginForm';

export { LoginForm, loginSchema };
export type { LoginFormValues };
