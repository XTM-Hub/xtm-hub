'use client';

import { cn } from '@/lib/utils';
import {
  Paper,
  type PaperElevation,
  type PaperPadding,
} from '@filigran/design-system';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as React from 'react';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

export interface PopoverContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>,
  'asChild' | 'title'
> {
  elevation?: Exclude<PaperElevation, 0>;
  padding?: PaperPadding;
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      className,
      children,
      align = 'start',
      sideOffset = 4,
      elevation = 1,
      padding = 16,
      ...props
    },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        {...props}
        asChild>
        <Paper
          elevation={elevation}
          padding={padding}
          className={cn(
            'z-[var(--fds-z-overlay,50)] shadow-global-shadow outline-none',
            className
          )}>
          {children}
        </Paper>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverContent, PopoverTrigger };
