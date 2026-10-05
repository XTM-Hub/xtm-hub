import { XtmPlatformTrialMessagePanel } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/XtmPlatformTrialMessagePanel';
import { getTranslate } from '@/hooks/get-translate';
import { APP_PATH } from '@/utils/path/constant';
import { buildOidcRedirect, buildSignupRedirect } from '@/utils/redirect';
import { Button } from '@filigran/ui/servers';
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
            variant="secondary">
            <Link
              href={buildOidcRedirect(redirectPath)}
              prefetch={false}>
              {t('PublicLayout.Login')}
            </Link>
          </Button>
          <Button asChild>
            <Link href={buildSignupRedirect(redirectPath)}>
              {t('PublicLayout.SignUp')}
            </Link>
          </Button>
        </>
      }
    />
  );
};
