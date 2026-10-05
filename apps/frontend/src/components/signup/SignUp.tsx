'use client';

import { useTranslate } from '@/hooks/use-translate';
import FiligranLogo from '@public/filigran_logo.svg';
import FiligranLogoDark from '@public/filigran_logo_dark.svg';
import SchemeXtmHub from '@public/scheme_xtm_hub_account_creation.svg';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const HUBSPOT_PORTAL_ID = '26791207';
const HUBSPOT_FORM_ID = '10b2ca41-4734-46d8-96dd-ac410a10a937';
const HUBSPOT_REGION = 'eu1';

const SignUp = ({ showLocalLogin = false }: { showLocalLogin?: boolean }) => {
  const t = useTranslate('SignUpPage');
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const oidcHref = redirect
    ? `/auth/oidc?redirect=${encodeURIComponent(redirect)}`
    : '/auth/oidc';
  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login';

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js-eu1.hsforms.net/forms/embed/v2.js';
    script.async = true;

    script.onload = () => {
      const win = window as Window & {
        hbspt?: {
          forms: {
            create: (options: {
              portalId: string;
              formId: string;
              region: string;
              target: string;
            }) => void;
          };
        };
      };
      if (win.hbspt) {
        win.hbspt.forms.create({
          portalId: HUBSPOT_PORTAL_ID,
          formId: HUBSPOT_FORM_ID,
          region: HUBSPOT_REGION,
          target: '#hubspot-form',
        });
      }
    };

    document.body.appendChild(script);

    // Toggle 'has-value' class on fields when inputs have content
    const container = document.getElementById('hubspot-form');
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      const field = target.closest('.field');
      if (field) {
        field.classList.toggle('has-value', target.value.length > 0);
      }
    };
    container?.addEventListener('input', handleInput);
    container?.addEventListener('change', handleInput);

    return () => {
      script.remove();
      container?.removeEventListener('input', handleInput);
      container?.removeEventListener('change', handleInput);
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:h-screen w-screen overflow-y-auto md:overflow-hidden">
      <div className="bg-elevation-background-layer-1 flex md:h-full md:w-2/5 flex-col pl-6 pr-0 py-6 md:overflow-hidden order-1">
        {/* Header */}
        <div className="shrink-0 flex justify-center pr-6">
          <FiligranLogoDark className="h-8.25 w-33" />
        </div>
        {/* Body */}
        <div className="md:flex-1 md:min-h-0 md:overflow-y-auto pr-6 scrollbar-thin [scrollbar-color:transparent_transparent] hover:[scrollbar-color:hsl(var(--muted-foreground)/0.4)_transparent] transition-[scrollbar-color] duration-300">
          <div className="mx-auto w-full max-w-125 flex flex-col justify-start min-h-full py-6">
            <h1 className="shrink-0 mt-auto text-3xl leading-9 font-medium text-foreground">
              {t('Title1')}
              <br />
              {t('Title2')}
            </h1>
            <p className="shrink-0 mt-2 text-sm leading-6 font-bold text-foreground">
              {t('Subtitle')}
            </p>
            <div
              id="hubspot-form"
              className="mt-l mb-auto w-full shrink-0"
            />
          </div>
        </div>
        {/* Footer */}
        <div className="shrink-0 flex flex-col items-center gap-1.5 text-xs pr-6">
          <p className="text-sm leading-6 text-foreground flex items-center gap-2">
            {t('AlreadyHaveAccount')}
            <Link
              href={oidcHref}
              prefetch={false}
              className="text-primary font-bold underline">
              {t('LogIn')}
            </Link>
          </p>
          {showLocalLogin && (
            <Link
              href={loginHref}
              className="text-primary underline">
              {t('LoginWithLocal')}
            </Link>
          )}
          <div className="flex items-center gap-1 text-muted-foreground/20 text-xs">
            {t('MadeBy')}
            <FiligranLogo className="h-4 w-auto" />
          </div>
        </div>
      </div>
      <div
        className="md:w-3/5 flex flex-col justify-center order-2"
        style={{ backgroundColor: 'var(--color-ds-bg-1)' }}>
        <div className="flex flex-col items-center gap-8 m-[clamp(2rem,5vw,8rem)]">
          <div className="shrink-0 flex flex-col gap-1 text-center">
            <p className="text-sm leading-6 font-bold text-primary">
              {t('WelcomeTitle')}
            </p>
            <h2 className="text-3xl leading-9 font-medium text-foreground">
              {t('WelcomeSubtitle')}
            </h2>
          </div>
          <div className="w-full flex items-start justify-center md:flex-1 md:min-h-0">
            <SchemeXtmHub className="w-full h-auto md:h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
