import { cn } from '@/components/filigran-ui/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

const calloutVariants = cva(
  'flex items-start justify-start text-left text-sm px-3 py-2 rounded border border-transparent',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        warning: 'bg-orange text-black',
        destructive: 'bg-destructive text-primary-foreground',
        outline: 'bg-transparent border-primary text-primary',
      },
    },
    defaultVariants: {
      variant: 'warning',
    },
  }
);

interface CalloutProps
  extends
    HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {}

const Callout = ({ className, variant, ...props }: CalloutProps) => {
  return (
    <div
      className={cn(calloutVariants({ variant }), className)}
      {...props}>
      <div className="inline-flex items-center">{props.children}</div>
    </div>
  );
};

export { Callout, calloutVariants };
