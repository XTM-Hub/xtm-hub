'use client';

import { cn } from '@/lib/utils';
import { Icon, IconButton, Paper } from '@filigran/design-system';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';

const EXPANDED_COMBOBOX_SELECTOR = '[role="combobox"][aria-expanded="true"]';

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

export interface SheetContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
  'asChild' | 'title'
> {
  side?: 'left' | 'right';
  closeLabel?: string;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  (
    {
      side = 'right',
      className,
      children,
      closeLabel = 'Close',
      onEscapeKeyDown,
      ...props
    },
    ref
  ) => {
    const handleEscapeKeyDown = (event: KeyboardEvent) => {
      // Radix catches Escape on the document before the input sees it, so an
      // open suggestion list would close the whole sheet instead of itself.
      if (
        event.target instanceof Element &&
        event.target.matches(EXPANDED_COMBOBOX_SELECTOR)
      ) {
        event.preventDefault();
        return;
      }
      onEscapeKeyDown?.(event);
    };

    return (
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-[var(--fds-z-overlay,50)] layer-0 bg-elevation-default backdrop-blur-sm opacity-80" />
        <SheetPrimitive.Content
          ref={ref}
          onEscapeKeyDown={handleEscapeKeyDown}
          {...props}
          asChild>
          <Paper
            elevation={2}
            padding={0}
            className={cn(
              'fixed inset-y-0 z-[var(--fds-z-overlay,50)] flex h-full w-full flex-col rounded-none pt-16 shadow-global-shadow outline-none md:w-1/2',
              side === 'left' ? 'left-0' : 'right-0',
              className
            )}>
            <div className="h-full overflow-y-auto px-6 pt-6">{children}</div>
            <div className="absolute right-3 top-0 z-10 flex h-16 items-center">
              <SheetPrimitive.Close asChild>
                <IconButton
                  priority="tertiary"
                  aria-label={closeLabel}
                  icon={
                    <Icon
                      name="x"
                      size={16}
                      className="text-icon-default"
                    />
                  }
                />
              </SheetPrimitive.Close>
            </div>
          </Paper>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    );
  }
);
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'absolute inset-x-0 top-0 z-1 flex h-16 flex-col justify-center pl-6 pr-14 bg-elevation-heading',
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('m-0 title-sm text-default-primary', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('m-0 content-base text-default-primary', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center justify-end gap-2 pb-6', className)}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
