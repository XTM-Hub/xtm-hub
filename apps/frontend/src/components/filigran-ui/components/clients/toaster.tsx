'use client';

import { CheckCircleIcon, InfoIcon, WarningIcon } from '@filigran/icon';
import * as React from 'react';
import { cn } from '../../lib/utils';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastLabel,
  type ToastProps,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';
import { useToast } from './use-toast';

type ToastVariant = NonNullable<ToastProps['variant']>;
const iconClassNames: Record<ToastVariant, string> = {
  info: 'text-feedback-info-primary',
  success: 'text-feedback-success-primary',
  alert: 'text-feedback-alert-primary',
  warning: 'text-feedback-warning-primary',
  error: 'text-feedback-error-primary',
  destructive: 'text-feedback-error-primary',
};

const actionClassNames: Record<ToastVariant, string> = {
  info: 'border-feedback-info-primary text-feedback-info-primary',
  success: 'border-feedback-success-primary text-feedback-success-primary',
  alert: 'border-feedback-alert-primary text-feedback-alert-primary',
  warning: 'border-feedback-warning-primary text-feedback-warning-primary',
  error: 'border-feedback-error-primary text-feedback-error-primary',
  destructive: 'border-feedback-error-primary text-feedback-error-primary',
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        label,
        description,
        action,
        variant = 'success',
        ...props
      }) {
        const resolvedVariant: ToastVariant = variant ?? 'success';
        const iconClassName = iconClassNames[resolvedVariant];
        const actionClassName = actionClassNames[resolvedVariant];
        const iconBaseClassName = `h-4 w-4 shrink-0 ${iconClassName}`;
        const iconWrapperClassName = cn(
          'flex shrink-0 items-center',
          title ? 'h-6' : 'h-5'
        );
        const renderedAction =
          action && React.isValidElement<{ className?: string }>(action)
            ? React.cloneElement(action, {
                className: cn(action.props.className, actionClassName),
              })
            : action;
        const icon =
          resolvedVariant === 'success' ? (
            <CheckCircleIcon className={iconBaseClassName} />
          ) : resolvedVariant === 'info' ? (
            <InfoIcon className={iconBaseClassName} />
          ) : (
            <WarningIcon className={iconBaseClassName} />
          );

        return (
          <Toast
            key={id}
            variant={resolvedVariant}
            {...props}>
            <div className="flex items-start gap-s">
              {icon && <div className={iconWrapperClassName}>{icon}</div>}
              <div className="grid min-w-0 flex-1 gap-1">
                {title ? (
                  <>
                    <div className="flex min-w-0 items-start gap-s">
                      <ToastTitle className="min-w-0 flex-1">
                        {title}
                      </ToastTitle>
                      <div className="ml-auto flex shrink-0 items-center gap-xs">
                        {label && <ToastLabel>{label}</ToastLabel>}
                        <ToastClose />
                      </div>
                    </div>
                    {description && (
                      <ToastDescription>{description}</ToastDescription>
                    )}
                  </>
                ) : (
                  <div className="flex min-w-0 items-start gap-s">
                    {description && (
                      <ToastDescription className="min-w-0 flex-1">
                        {description}
                      </ToastDescription>
                    )}
                    <div className="ml-auto flex shrink-0 items-center gap-xs">
                      {label && <ToastLabel>{label}</ToastLabel>}
                      <ToastClose />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {renderedAction}
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
