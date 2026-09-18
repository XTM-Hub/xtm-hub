'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';
import { LoginSSOButton } from './login-sso-button';
import type { SSOProvider } from './login-types';

export interface LoginSSOGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  providers: SSOProvider[];
  onProviderClick?: (provider: SSOProvider) => void;
}

const LoginSSOGroup = React.forwardRef<HTMLDivElement, LoginSSOGroupProps>(
  ({ className, providers, onProviderClick, ...props }, ref) => {
    if (providers.length === 0) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-row flex-wrap items-center justify-center gap-2',
          className
        )}
        {...props}>
        {providers.map((provider) => (
          <LoginSSOButton
            key={provider.provider}
            provider={provider}
            onClick={onProviderClick}
          />
        ))}
      </div>
    );
  }
);
LoginSSOGroup.displayName = 'LoginSSOGroup';

export { LoginSSOGroup };
