import { cn } from '@/components/filigran-ui/lib/utils';
import type { ReactNode } from 'react';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClass?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, containerClass, ...props }, ref) => {
    const hasIcons = startIcon || endIcon;

    if (hasIcons) {
      return (
        <div className={cn('w-full relative h-fit', containerClass)}>
          {startIcon && (
            <div className="absolute left-s top-1/2 transform -translate-y-1/2">
              {startIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-9 w-full rounded bg-input-bg-default px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              startIcon ? 'pl-xxl' : '',
              endIcon ? 'pr-xxl' : '',
              className
            )}
            ref={ref}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-s top-1/2 transform -translate-y-1/2">
              {endIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded bg-input-bg-default px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
