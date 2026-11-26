'use client';

import { CookieSettingsLink } from '@/components/cookie-consent/CookieSettingsLink';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import {
  FiligranWebsiteUtmCampaign,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';
import Link from 'next/link';

const footerUtm = (content: string) => ({
  campaign: FiligranWebsiteUtmCampaign.FOOTER,
  content,
});

const FOOTER_LINKS = {
  copyright: withFiligranWebsiteUtm(
    'https://filigran.io/',
    footerUtm('copyright')
  ),
  filigranWebsite: withFiligranWebsiteUtm(
    'https://filigran.io/',
    footerUtm('filigran_website')
  ),
  privacyPolicy: withFiligranWebsiteUtm(
    'https://filigran.io/privacy-policy',
    footerUtm('privacy_policy')
  ),
  termsOfService: withFiligranWebsiteUtm(
    'https://filigran.io/mssa',
    footerUtm('terms_of_service')
  ),
  licenses: withFiligranWebsiteUtm(
    'https://filigran.io/licenses',
    footerUtm('licenses')
  ),
};

interface AppFooterProps {
  className?: string;
}

export const AppFooter = ({ className }: AppFooterProps) => {
  const t = useTranslate('AppFooter');

  return (
    <footer
      className={cn(
        'text-default-primary content-compact pt-6 px-0',
        className
      )}>
      <div className="items-center justify-between flex flex-col md:flex-row w-full px-4 py-2 gap-4 text-center">
        <span className="text-content-compact-link">
          <Link
            {...analyticsId('footer_copyright_open')}
            href={FOOTER_LINKS.copyright}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-70"
            suppressHydrationWarning>
            {/* eslint-disable-next-line xtm-hub-i18n-rules/no-literal-string-in-jsx */}
            © {new Date().getFullYear()} Filigran.
          </Link>{' '}
          {t('AllRightsReserved')}
        </span>
        <ul className="flex flex-col md:flex-row gap-4 text-content-compact-link">
          <li>
            <Link
              {...analyticsId('footer_filigran_website_open')}
              target="_blank"
              rel="noopener noreferrer"
              href={FOOTER_LINKS.filigranWebsite}
              className="transition-opacity hover:opacity-70">
              {t('FiligranWebsite')}
            </Link>
          </li>
          <li>
            <Link
              {...analyticsId('footer_documentation_open')}
              target="_blank"
              rel="noopener noreferrer"
              href="https://docs.hub.filigran.io/latest/"
              className="transition-opacity hover:opacity-70">
              {t('Documentation')}
            </Link>
          </li>
          <li>
            <Link
              {...analyticsId('footer_privacy_policy_open')}
              target="_blank"
              rel="noopener noreferrer"
              href={FOOTER_LINKS.privacyPolicy}
              className="transition-opacity hover:opacity-70">
              {t('PrivacyPolicy')}
            </Link>
          </li>
          <li>
            <CookieSettingsLink className="transition-opacity hover:opacity-70" />
          </li>
          <li>
            <Link
              {...analyticsId('footer_terms_of_service_open')}
              target="_blank"
              rel="noopener noreferrer"
              href={FOOTER_LINKS.termsOfService}
              className="transition-opacity hover:opacity-70">
              {t('TermsOfService')}
            </Link>
          </li>
          <li>
            <Link
              {...analyticsId('footer_licenses_open')}
              target="_blank"
              rel="noopener noreferrer"
              href={FOOTER_LINKS.licenses}
              className="transition-opacity hover:opacity-70">
              {t('Licenses')}
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
};
