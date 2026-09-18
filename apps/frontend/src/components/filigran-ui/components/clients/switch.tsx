'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';
import { cn } from '../../lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'group peer inline-flex h-4 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',

      // OFF
      'bg-feedback-neutral-secondary',

      // ON
      'data-[state=checked]:bg-feedback-info-secondary',

      // disabled
      'data-[disabled]:cursor-not-allowed',
      'data-[disabled]:opacity-50',

      className
    )}
    {...props}
    ref={ref}>
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full shadow-md transition-all',

        'translate-x-0 data-[state=checked]:translate-x-6',

        'bg-text-default-primary',

        'data-[state=checked]:bg-feedback-info-primary',

        // disabled

        // halo
        'before:absolute before:inset-0 before:rounded-full before:scale-0 before:opacity-0 before:transition-all',
        'before:bg-primary/20',
        'group-focus-visible:before:scale-[2.5]',
        'group-focus-visible:before:opacity-100',

        'after:absolute after:inset-0 after:rounded-full',
        'after:scale-0 after:opacity-0',
        'after:bg-primary/30',
        'after:transition-all',
        'group-active:after:scale-[2.5]',
        'group-active:after:opacity-100',

        'group-hover:before:scale-[2]',
        'group-hover:before:opacity-100',
        'group-hover:before:scale-[2]',
        'group-hover:before:opacity-100'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
