'use client';

import { cn } from '@/components/filigran-ui/lib/utils';
import * as React from 'react';
import { Checkbox } from '../Checkbox';
import type { LoginLabels } from './login-types';

export interface LoginConsentProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labels?: Pick<LoginLabels, 'consentConfirmText'>;
}

const LoginConsent = React.forwardRef<HTMLDivElement, LoginConsentProps>(
  ({ className, message, checked, onCheckedChange, labels, ...props }, ref) => {
    const confirmLabel =
      labels?.consentConfirmText ??
      'I have read and comply with the above statement';

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm',
          className
        )}
        {...props}>
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground">
          {message}
        </div>
        <div
          className="mt-3 flex cursor-pointer items-start gap-2"
          onClick={() => onCheckedChange(!checked)}>
          <Checkbox
            checked={checked}
            onCheckedChange={(val) => onCheckedChange(val === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-muted-foreground">{confirmLabel}</span>
        </div>
      </div>
    );
  }
);
LoginConsent.displayName = 'LoginConsent';

export { LoginConsent };
