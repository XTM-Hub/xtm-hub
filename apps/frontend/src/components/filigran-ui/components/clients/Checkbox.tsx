'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as React from 'react';

import { cn } from '@/components/filigran-ui/lib/utils';
import { CheckBoldIcon, CheckIndeterminateSmallBoldIcon } from '@filigran/icon';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'border border-elevation-border-strong-layer-2 peer h-[1.125rem] w-[1.125rem] shrink-0 rounded ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 bg-input-bg-default',
      className
    )}
    checked={checked}
    {...props}>
    <CheckboxPrimitive.Indicator
      className={cn(
        'flex h-full flex-1 items-center justify-center text-current'
      )}>
      {/* In case the checked is not controlled, the checked props is undefined */}
      {checked === undefined && <CheckBoldIcon className="w-[0.625rem]" />}
      {checked === true && <CheckBoldIcon className="w-[0.625rem]" />}
      {checked === 'indeterminate' && (
        <CheckIndeterminateSmallBoldIcon className="text-text-default-primary w-2" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
