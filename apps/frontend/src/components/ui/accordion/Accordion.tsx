'use client';

import { cn } from '@/lib/utils';
import { Icon } from '@filigran/design-system';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as React from 'react';

export type AccordionProps = React.ComponentPropsWithoutRef<
  typeof AccordionPrimitive.Root
>;

export type AccordionItemProps = React.ComponentPropsWithoutRef<
  typeof AccordionPrimitive.Item
>;

export type AccordionTriggerProps = Omit<
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>,
  'asChild'
>;

export type AccordionContentProps = React.ComponentPropsWithoutRef<
  typeof AccordionPrimitive.Content
>;

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, ...props }, ref) => (
    <AccordionPrimitive.Item
      ref={ref}
      className={className}
      {...props}
    />
  )
);
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'group/accordion-trigger flex flex-1 cursor-pointer items-center justify-between gap-2 py-2 pr-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 outline-focus',
        className
      )}
      {...props}>
      {children}
      {/* Named so a caller's own open group ancestor cannot turn the chevron. */}
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 transition-transform duration-150 motion-reduce:transition-none group-data-[state=open]/accordion-trigger:rotate-180">
        <Icon
          name="chevron-down"
          size={16}
        />
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = 'AccordionTrigger';

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden pl-1"
    {...props}>
    <div className={cn('pb-2 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
