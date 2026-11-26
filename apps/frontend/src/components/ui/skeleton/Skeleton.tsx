import { cn } from '@/lib/utils';
import * as React from 'react';

export type SkeletonProps = React.ComponentPropsWithoutRef<'div'>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      className={cn(
        'motion-safe:animate-pulse rounded-sm bg-feedback-neutral-secondary',
        className
      )}
    />
  )
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
