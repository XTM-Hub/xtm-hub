'use client';

import { cn } from '@/components/filigran-ui/lib/utils';
import * as React from 'react';
import { LoginAsideDefaultContent } from './LoginAsideContent';
import { LoginMadeByFiligran } from './LoginMadeByFiligran';
import type { LoginAsideConfig } from './login-types';

export interface LoginLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  aside?: LoginAsideConfig;
  logo?: React.ReactNode;
  asideContent?: React.ReactNode;
  hideBranding?: boolean;
}

const getAsideBackground = (aside?: LoginAsideConfig): string | undefined => {
  if (!aside || aside.variant === 'default' || !aside.variant) {
    return undefined;
  }

  if (aside.variant === 'color' && aside.color) {
    return aside.color;
  }

  if (
    aside.variant === 'gradient' &&
    aside.gradientStart &&
    aside.gradientEnd
  ) {
    return `linear-gradient(135deg, ${aside.gradientStart} 0%, ${aside.gradientEnd} 100%)`;
  }

  if (aside.variant === 'image' && aside.image) {
    return `url(${aside.image})`;
  }

  return undefined;
};

const LoginLayout = React.forwardRef<HTMLDivElement, LoginLayoutProps>(
  (
    { className, aside, logo, asideContent, hideBranding, children, ...props },
    ref
  ) => {
    const customBackground = getAsideBackground(aside);
    const isImage = aside?.variant === 'image';

    return (
      <div
        ref={ref}
        className={cn('flex h-full w-full', className)}
        {...props}>
        <div className="z-[2] flex min-w-[500px] flex-1 flex-col items-center justify-center gap-8 overflow-auto bg-background shadow-lg">
          {logo && (
            <div className="flex items-center justify-center">{logo}</div>
          )}
          <div className="flex w-[500px] max-w-full flex-col gap-2 px-4">
            {children}
          </div>
        </div>

        <div
          className={cn(
            'relative hidden flex-1 overflow-hidden lg:block',
            !customBackground &&
              'bg-[linear-gradient(100deg,#EAEAED_0%,#FEFEFF_100%)] dark:bg-[linear-gradient(100deg,#050A14_0%,#0C1728_100%)]'
          )}
          style={
            customBackground
              ? {
                  background: customBackground,
                  backgroundSize: isImage ? 'cover' : undefined,
                  backgroundPosition: isImage ? 'center' : undefined,
                }
              : undefined
          }>
          {asideContent ?? <LoginAsideDefaultContent />}
          {!hideBranding && <LoginMadeByFiligran />}
        </div>
      </div>
    );
  }
);
LoginLayout.displayName = 'LoginLayout';

export { LoginLayout };
