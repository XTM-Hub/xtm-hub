'use client';

import { ArrowDropDownIcon } from '@filigran/icon';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils';
import { buttonVariants } from '../servers/button';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const accordionTriggerVariants = cva(
  'flex flex-1 items-center justify-between py-2 pr-2 font-medium transition-all hover:underline',
  {
    variants: {
      variant: {
        default: '[&[data-state=open]>.accordion-arrow-icon]:rotate-180',
        colored:
          'border-t border-elevation-background-layer-3 hover:cursor-pointer [&[data-state=open]_.accordion-arrow-icon]:rotate-180',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface AccordionTriggerProps
  extends
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>,
    VariantProps<typeof accordionTriggerVariants> {}

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, variant, ...props }, ref) => {
  const showColoredTrigger = variant === 'colored';

  return (
    <AccordionPrimitive.Header
      className={cn('flex', showColoredTrigger && 'items-center gap-1')}>
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(accordionTriggerVariants({ variant }), className)}
        {...props}>
        {children}
        {showColoredTrigger ? (
          <span
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'icon' }),
              'shrink-0'
            )}>
            <ArrowDropDownIcon className="accordion-arrow-icon h-5 w-5 shrink-0 transition-transform duration-200" />
          </span>
        ) : (
          <ArrowDropDownIcon className="accordion-arrow-icon h-5 w-5 shrink-0 transition-transform duration-200" />
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden pl-1 transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}>
    <div className={cn('pb-2 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
));

AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
