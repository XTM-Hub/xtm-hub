'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../../lib/utils';

const loginAlertVariants = cva(
  'flex items-start gap-2 rounded border border-border px-3 py-2 text-sm',
  {
    variants: {
      variant: {
        error: 'border-destructive/50 bg-destructive/10 text-destructive',
        warning: 'border-orange/50 bg-orange/10 text-orange',
        info: 'border-primary/50 bg-primary/10 text-primary',
        success: 'border-secondary/50 bg-secondary/10 text-secondary',
      },
    },
    defaultVariants: {
      variant: 'error',
    },
  }
);

export interface LoginAlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loginAlertVariants> {}

const LoginAlert = React.forwardRef<HTMLDivElement, LoginAlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(loginAlertVariants({ variant }), className)}
      {...props}
    />
  )
);
LoginAlert.displayName = 'LoginAlert';

export { LoginAlert, loginAlertVariants };
