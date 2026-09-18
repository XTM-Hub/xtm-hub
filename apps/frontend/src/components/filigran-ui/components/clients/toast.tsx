'use client';

import { CloseIcon } from '@filigran/icon';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed left-1/2 top-0 z-[100] flex max-h-screen w-full -translate-x-1/2 transform flex-col-reverse p-xl md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full flex-col gap-m overflow-hidden rounded p-m shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0',
  {
    variants: {
      variant: {
        info: 'toast-info bg-feedback-info-secondary-transparency backdrop-blur-[20px]',
        success:
          'toast-success bg-feedback-success-secondary-transparency backdrop-blur-[20px]',
        alert:
          'toast-alert bg-feedback-alert-secondary-transparency backdrop-blur-[20px]',
        warning:
          'toast-warning bg-feedback-warning-secondary-transparency backdrop-blur-[20px]',
        error:
          'toast-error bg-feedback-error-secondary-transparency backdrop-blur-[20px]',
        destructive:
          'toast-error bg-feedback-error-secondary-transparency backdrop-blur-[20px]',
      },
    },
    defaultVariants: {
      variant: 'success',
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 rounded border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      'group-[.toast-info]:border-feedback-info-primary group-[.toast-info]:text-feedback-info-primary',
      'group-[.toast-success]:border-feedback-success-primary group-[.toast-success]:text-feedback-success-primary',
      'group-[.toast-alert]:border-feedback-alert-primary group-[.toast-alert]:text-feedback-alert-primary',
      'group-[.toast-warning]:border-feedback-warning-primary group-[.toast-warning]:text-feedback-warning-primary',
      'group-[.toast-error]:border-feedback-error-primary group-[.toast-error]:text-feedback-error-primary',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'inline-flex h-5 w-5 shrink-0 items-center justify-center',
      'group-[.toast-info]:text-feedback-info-primary',
      'group-[.toast-success]:text-feedback-success-primary',
      'group-[.toast-alert]:text-feedback-alert-primary',
      'group-[.toast-warning]:text-feedback-warning-primary',
      'group-[.toast-error]:text-feedback-error-primary',
      className
    )}
    toast-close=""
    {...props}>
    <CloseIcon className="h-3 w-3" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'content-body-base-bold leading-normal',
      'group-[.toast-info]:text-feedback-info-primary',
      'group-[.toast-success]:text-feedback-success-primary',
      'group-[.toast-alert]:text-feedback-alert-primary',
      'group-[.toast-warning]:text-feedback-warning-primary',
      'group-[.toast-error]:text-feedback-error-primary',
      className
    )}
    {...props}
  />
));
ToastLabel.displayName = 'ToastLabel';

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('heading-xs text-text-default-primary', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('content-body-compact text-text-default-primary', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastLabel,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastActionElement,
  type ToastProps,
};
