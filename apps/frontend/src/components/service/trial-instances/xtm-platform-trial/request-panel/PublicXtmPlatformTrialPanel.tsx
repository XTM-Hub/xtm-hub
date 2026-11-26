import { XtmPlatformTrialMessagePanel } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/XtmPlatformTrialMessagePanel';
import { getTranslate } from '@/hooks/get-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { APP_PATH } from '@/utils/path/constant';
import { buildOidcRedirect, buildSignupRedirect } from '@/utils/redirect';
import { Button } from '@filigran/design-system';
import Link from 'next/link';

export const PublicXtmPlatformTrialPanel = async () => {
  const t = await getTranslate();

  const redirectPath = `/${APP_PATH}/service/xtm-platform-trial`;

  return (
    <XtmPlatformTrialMessagePanel
      title={t('Service.Trials.XtmPlatform.Page.NotLoggedIn.Title')}
      description={t('Service.Trials.XtmPlatform.Page.NotLoggedIn.Description')}
      actions={
        <>
          <Button
            asChild
            priority="secondary">
            <Link
              {...analyticsId('account_login_open')}
              href={buildOidcRedirect(redirectPath)}
              prefetch={false}>
              {t('PublicLayout.Login')}
            </Link>
          </Button>
          <Button asChild>
            <Link
              {...analyticsId('account_signup_open')}
              href={buildSignupRedirect(redirectPath)}>
              {t('PublicLayout.SignUp')}
            </Link>
          </Button>
        </>
      }
    />
  );
};
