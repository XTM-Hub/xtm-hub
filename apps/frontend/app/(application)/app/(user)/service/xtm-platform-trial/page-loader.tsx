'use client';

import { PrivateXtmPlatformTrialPanel } from '@/components/service/trial-instances/xtm-platform-trial/PrivateXtmPlatformTrialPanel';
import { XtmPlatformTrialPage as XtmPlatformTrialPitchPage } from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialPage';
import { useXtmPlatformTrialPanelView } from '@/components/service/trial-instances/xtm-platform-trial/useXtmPlatformTrialPanelView';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { XtmPlatformTrialPage as XtmPlatformTrialBundlePage } from '@/components/xtm-platform-trial/XtmPlatformTrialPage';
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
  const { data, isLoading } = useXtmPlatformBundleQuery(
    portalGraphqlClient,
    undefined,
    {
      queryKey: xtmPlatformBundleKeys.all(),
    }
  );

  const bundle = data?.xtmPlatformBundle ?? null;

  const { view, showLimitations, ongoingStandaloneTrials } =
    useXtmPlatformTrialPanelView(bundle, {
      enabled: bundle?.hub_status !== DeploymentRequestHubStatus.Active,
    });

  if (isLoading) {
    return null;
  }

  return (
    <>
      <BreadcrumbNav value={breadcrumbs} />
      {bundle?.hub_status === DeploymentRequestHubStatus.Active ? (
        <XtmPlatformTrialBundlePage />
      ) : (
        <XtmPlatformTrialPitchPage
          panel={
            <PrivateXtmPlatformTrialPanel
              bundle={bundle}
              view={view}
              ongoingStandaloneTrials={ongoingStandaloneTrials}
            />
          }
          showLimitations={showLimitations}
        />
      )}
    </>
  );
};

export default PageLoader;
