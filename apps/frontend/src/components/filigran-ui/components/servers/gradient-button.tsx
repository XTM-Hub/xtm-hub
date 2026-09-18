import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button, type ButtonProps } from './button';

type GradientVariant = 'highlight' | 'ia';

const gradientVariants: Record<GradientVariant, { from: string; to: string }> =
  {
    highlight: {
      from: 'var(--color-filigran-brand-primary)',
      to: 'var(--color-filigran-tonic-primary)',
    },
    ia: {
      from: 'var(--color-filigran-ia-main)',
      to: 'var(--color-filigran-ia-secondary)',
    },
  };

export interface GradientButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: GradientVariant;
  gradientFrom?: string;
  gradientTo?: string;
  gradientBg?: string;
  textGradient?: boolean;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    {
      className,
      variant = 'highlight',
      gradientFrom,
      gradientTo,
      gradientBg = 'hsl(var(--background))',
      textGradient = true,
      children,
      ...props
    },
    ref
  ) => {
    const selectedGradient = gradientVariants[variant];
    const from = gradientFrom ?? selectedGradient.from;
    const to = gradientTo ?? selectedGradient.to;

    const customStyle = {
      '--gradient-from': from,
      '--gradient-to': to,
      '--gradient-bg': gradientBg,
    } as React.CSSProperties;

    return (
      <Button
        ref={ref}
        className={cn(
          'border-2 border-transparent',
          '[background:linear-gradient(var(--gradient-bg),var(--gradient-bg))_padding-box,linear-gradient(99.95deg,var(--gradient-from)_0%,var(--gradient-to)_100%)_border-box]',
          '[box-shadow:1px_0px_4px_-1px_var(--gradient-from),-1px_0px_4px_-1px_var(--gradient-to)]',
          'hover:[box-shadow:1px_0px_6px_-1px_var(--gradient-from),-1px_0px_6px_-1px_var(--gradient-to)]',
          'hover:[background:linear-gradient(var(--gradient-bg),var(--gradient-bg))_padding-box,linear-gradient(99.95deg,var(--gradient-to)_0%,var(--gradient-from)_100%)_border-box]',
          'transition-all duration-300',
          className
        )}
        style={customStyle}
        {...props}>
        {textGradient ? (
          <span className="bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] bg-clip-text text-transparent">
            {children}
          </span>
        ) : (
          children
        )}
      </Button>
    );
  }
);
GradientButton.displayName = 'GradientButton';

export { GradientButton };
