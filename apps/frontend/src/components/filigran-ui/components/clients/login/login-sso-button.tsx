'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';
import { Button } from '../../servers/button';
import type { SSOProvider } from './login-types';

export interface LoginSSOButtonProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onClick'
> {
  provider: SSOProvider;
  onClick?: (provider: SSOProvider) => void;
}

const LoginSSOButton = React.forwardRef<HTMLAnchorElement, LoginSSOButtonProps>(
  ({ className, provider, onClick, ...props }, ref) => {
    const label = provider.buttonLabel ?? provider.name;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick) {
        e.preventDefault();
        onClick(provider);
      }
    };

    return (
      <Button
        variant="outline"
        className={cn('gap-2', className)}
        asChild>
        <a
          ref={ref}
          href={provider.href}
          onClick={handleClick}
          {...props}>
          {provider.icon && (
            <span className="flex h-4 w-4 items-center justify-center">
              {provider.icon}
            </span>
          )}
          {label}
        </a>
      </Button>
    );
  }
);
LoginSSOButton.displayName = 'LoginSSOButton';

export { LoginSSOButton };
