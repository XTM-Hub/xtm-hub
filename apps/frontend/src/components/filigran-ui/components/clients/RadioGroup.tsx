'use client';

import { cn } from '@/components/filigran-ui/lib/utils';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as React from 'react';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('grid gap-2', className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex h-5 w-5 bg-elevation-background-layer-2 cursor-pointer items-center justify-center rounded-full border-2 text-primary ring-offset-background transition-colors before:absolute before:-inset-2 before:rounded-full before:bg-current before:opacity-0 before:transition-opacity hover:before:opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-elevation-border-strong-layer-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:before:opacity-0',
        className
      )}
      {...props}>
      <RadioGroupPrimitive.Indicator
        forceMount
        className="flex items-center justify-center transition-all duration-150 ease-out data-[state=checked]:scale-100 data-[state=checked]:opacity-100 data-[state=unchecked]:scale-0 data-[state=unchecked]:opacity-0">
        <span className="h-2.5 w-2.5 origin-center rounded-full bg-text-default-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
