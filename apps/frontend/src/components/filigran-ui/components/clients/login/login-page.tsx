'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';
import { LoginAlert } from './login-alert';
import { LoginConsent } from './login-consent';
import { LoginForm } from './login-form';
import { LoginLayout } from './login-layout';
import { LoginSSOGroup } from './login-sso-group';
import type { LoginAsideConfig, LoginLabels, SSOProvider } from './login-types';

export interface LoginPageProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSubmit'
> {
  onSubmit: (values: {
    email: string;
    password: string;
  }) => void | Promise<void>;
  providers?: SSOProvider[];
  hasCredentialsForm?: boolean;
  consentMessage?: string;
  loginMessage?: string;
  logo?: React.ReactNode;
  aside?: LoginAsideConfig;
  asideContent?: React.ReactNode;
  hideBranding?: boolean;
  onForgotPassword?: () => void;
  onSSOClick?: (provider: SSOProvider) => void;
  error?: string;
  alerts?: Array<{
    variant: 'error' | 'warning' | 'info' | 'success';
    message: string;
    key?: string;
  }>;
  labels?: LoginLabels;
  disabled?: boolean;
}

const LoginPage = React.forwardRef<HTMLDivElement, LoginPageProps>(
  (
    {
      className,
      onSubmit,
      providers = [],
      hasCredentialsForm = true,
      consentMessage,
      loginMessage,
      logo,
      aside,
      asideContent,
      hideBranding,
      onForgotPassword,
      onSSOClick,
      error,
      alerts,
      labels,
      disabled,
      ...props
    },
    ref
  ) => {
    const [consentChecked, setConsentChecked] = React.useState(false);

    const hasConsent = !!consentMessage;
    const consentOk = !hasConsent || consentChecked;
    const ssoProviders = providers.filter((p) => p.href);
    const hasProviders = hasCredentialsForm || ssoProviders.length > 0;

    return (
      <LoginLayout
        ref={ref}
        className={cn(className)}
        aside={aside}
        logo={logo}
        asideContent={asideContent}
        hideBranding={hideBranding}
        {...props}>
        {hasConsent && (
          <LoginConsent
            message={consentMessage}
            checked={consentChecked}
            onCheckedChange={setConsentChecked}
            labels={labels}
          />
        )}

        {alerts?.map((alert, index) => (
          <LoginAlert
            key={alert.key ?? index}
            variant={alert.variant}>
            {alert.message}
          </LoginAlert>
        ))}

        {!hasProviders && (
          <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-card-foreground shadow-sm">
            {labels?.noProviderMessage ??
              'No authentication provider available'}
          </div>
        )}

        {loginMessage && (
          <p className="text-center text-sm text-muted-foreground">
            {loginMessage}
          </p>
        )}

        {consentOk && hasCredentialsForm && (
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <LoginForm
              onSubmit={onSubmit}
              onForgotPassword={onForgotPassword}
              error={error}
              labels={labels}
              disabled={disabled}
            />
          </div>
        )}

        {consentOk && ssoProviders.length > 0 && (
          <LoginSSOGroup
            className="mt-2"
            providers={ssoProviders}
            onProviderClick={onSSOClick}
          />
        )}
      </LoginLayout>
    );
  }
);
LoginPage.displayName = 'LoginPage';

export { LoginPage };
