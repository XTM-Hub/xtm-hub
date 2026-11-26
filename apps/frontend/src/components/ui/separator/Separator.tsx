import { cn } from '@/lib/utils';
import * as React from 'react';

export interface SeparatorProps extends React.ComponentPropsWithoutRef<'div'> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref
  ) => {
    const semanticProps: Pick<
      React.HTMLAttributes<HTMLDivElement>,
      'role' | 'aria-orientation'
    > = decorative
      ? { role: 'none' }
      : {
          role: 'separator',
          'aria-orientation':
            orientation === 'vertical' ? 'vertical' : undefined,
        };

    return (
      <div
        ref={ref}
        data-orientation={orientation}
        {...semanticProps}
        {...props}
        className={cn(
          'shrink-0 border-elevation-subtle',
          orientation === 'horizontal' ? 'w-full border-t' : 'h-full border-l',
          className
        )}
      />
    );
  }
);
Separator.displayName = 'Separator';

export { Separator };
