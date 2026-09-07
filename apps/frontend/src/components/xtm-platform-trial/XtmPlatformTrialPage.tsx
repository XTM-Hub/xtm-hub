'use client';

import { ReachSalesButton } from '@/components/service/trial-instances/reach-sales/ReachSalesButton';
import { SlackSupportButton } from '@/components/service/trial-instances/SlackSupport';
import { XtmPlatformTrialLimitations } from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialLimitations';
import { BundleGuideCard } from '@/components/xtm-platform-trial/BundleGuideCard';
import { BundleInfoCard } from '@/components/xtm-platform-trial/BundleInfoCard';
import { BundleProductCard } from '@/components/xtm-platform-trial/BundleProductCard';
import { useXtmoneIntegrationStatus } from '@/components/xtm-platform-trial/useXtmoneIntegrationStatus';
import useGranted from '@/hooks/use-granted';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import {
  DeploymentRequestDeploymentType,
  OrganizationCapability,
  PlatformIdentifier,
  useXtmPlatformBundleQuery,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';

export const XtmPlatformTrialPage = () => {
  const t = useTranslations();

  const isAdminByPass = useAdminByPass();
  const canAdministrateOrganization = useGranted(
    OrganizationCapability.AdministrateOrganization
  );
  const canManagePlatformRegistration = useGranted(
    OrganizationCapability.ManagePlatformRegistration
  );

  const canManage =
    isAdminByPass ||
    canAdministrateOrganization ||
    canManagePlatformRegistration ||
    false;

  const { data, isLoading } = useXtmPlatformBundleQuery(
    portalGraphqlClient,
    undefined,
    {
      queryKey: xtmPlatformBundleKeys.all(),
    }
  );

  const bundle = data?.xtmPlatformBundle;

  const xtmoneServiceInstanceId =
    bundle?.children?.find(
      (product) => product.platform_identifier === PlatformIdentifier.Xtmone
    )?.service_instance_id ?? null;

  const xtmoneQuery = useXtmoneIntegrationStatus(xtmoneServiceInstanceId);
  const xtmoneStatus = {
    data: xtmoneQuery.data,
    isLoading: xtmoneQuery.isLoading,
    isError: xtmoneQuery.isError,
    hasUrl: !!xtmoneServiceInstanceId,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-m">
        <div className="h-8 w-64 rounded bg-elevation-surface-highlight-layer-1" />
        <div className="h-4 w-full rounded bg-elevation-surface-highlight-layer-1" />
        <div className="h-4 w-5/6 rounded bg-elevation-surface-highlight-layer-1" />
      </div>
    );
  }

  if (!bundle) {
    return null;
  }

  const findProduct = (identifier: PlatformIdentifier) =>
    (bundle.children ?? []).find(
      (product) => product.platform_identifier === identifier
    );
  const orderedProducts = [
    findProduct(PlatformIdentifier.Opencti),
    findProduct(PlatformIdentifier.Openaev),
    findProduct(PlatformIdentifier.Xtmone),
  ].filter((product) => product !== undefined);

  return (
    <div className="flex flex-col gap-m">
      <div className="flex flex-col gap-m sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-xs">
          <h1 className="heading-2xl">{t('XtmPlatformTrial.Title')}</h1>
          <p className="text-content-body-base text-text-default-secondary">
            {t('XtmPlatformTrial.Subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-s shrink-0">
          <ReachSalesButton
            variant="gradient"
            deploymentRequestType={DeploymentRequestDeploymentType.Bundle}
          />
          <SlackSupportButton />
        </div>
      </div>
      <div className="grid gap-m sm:grid-cols-2 lg:grid-cols-3">
        <BundleInfoCard
          bundle={bundle}
          canManage={canManage}
        />
        <div className="lg:col-span-2">
          <BundleGuideCard />
        </div>
      </div>
      <div className="grid gap-m sm:grid-cols-2 lg:grid-cols-3">
        {orderedProducts.map((product) => (
          <BundleProductCard
            key={product.service_instance_id}
            product={product}
            xtmoneStatus={xtmoneStatus}
            canManage={canManage}
          />
        ))}
      </div>
      <XtmPlatformTrialLimitations />
    </div>
  );
};
