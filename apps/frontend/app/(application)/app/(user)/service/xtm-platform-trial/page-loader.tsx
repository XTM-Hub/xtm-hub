'use client';

import { XtmPlatformActiveBundlePage as XtmPlatformTrialBundlePage } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/XtmPlatformActiveBundlePage';
import { PrivateXtmPlatformTrialPanel } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/PrivateXtmPlatformTrialPanel';
import { useXtmPlatformTrialPanelView } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/useXtmPlatformTrialPanelView';
import { deriveXtmPlatformTrialRequestPageLayout } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/xtm-platform-trial-panel.utils';
import { XtmPlatformTrialRequestPage } from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialRequestPage';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import {
  DeploymentRequestHubStatus,
  useXtmPlatformBundleQuery,
} from '@graphql/generated';

const breadcrumbs = [
  {
    label: 'MenuLinks.Home',
    href: `/${APP_PATH}`,
  },
  {
    label: 'Service.Trials.XtmPlatform.Page.Breadcrumb',
  },
];

const PageLoader = () => {
  const t = useTranslate();
  const { data, isLoading } = useXtmPlatformBundleQuery(
    portalGraphqlClient,
    undefined,
    {
      queryKey: xtmPlatformBundleKeys.all(),
    }
  );

  const bundle = data?.xtmPlatformBundle ?? null;

  const view = useXtmPlatformTrialPanelView(bundle);

  if (isLoading) {
    return null;
  }

  const { showLimitations, showExpiredTitle } =
    deriveXtmPlatformTrialRequestPageLayout(view);

  return (
    <>
      <BreadcrumbNav value={breadcrumbs} />
      {bundle?.hub_status === DeploymentRequestHubStatus.Active ? (
        <XtmPlatformTrialBundlePage />
      ) : (
        <XtmPlatformTrialRequestPage
          panel={
            <PrivateXtmPlatformTrialPanel
              bundle={bundle}
              view={view}
            />
          }
          showLimitations={showLimitations}
          title={
            showExpiredTitle
              ? t('Service.Trials.XtmPlatform.Page.ExpiredTitle')
              : undefined
          }
        />
      )}
    </>
  );
};

export default PageLoader;
