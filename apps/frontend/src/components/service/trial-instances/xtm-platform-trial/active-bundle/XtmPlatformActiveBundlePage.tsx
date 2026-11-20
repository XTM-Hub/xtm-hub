'use client';

import { ReachSalesButton } from '@/components/service/trial-instances/reach-sales/ReachSalesButton';
import { SlackSupportButton } from '@/components/service/trial-instances/SlackSupport';
import { BundleGuideSection } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleGuideSection';
import { BundleInfoSection } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleInfoSection';
import { BundleProductCard } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleProductCard';
import { useXtmoneIntegrationStatus } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/useXtmoneIntegrationStatus';
import { XtmPlatformTrialLimitations } from '@/components/service/trial-instances/xtm-platform-trial/shared/XtmPlatformTrialLimitations';
import useGranted from '@/hooks/use-granted';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import {
  OrganizationCapability,
  PlatformIdentifier,
  useXtmPlatformBundleQuery,
} from '@graphql/generated';

export const XtmPlatformActiveBundlePage = () => {
  const t = useTranslate();

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
      <div className="flex flex-col gap-3">
        <div className="h-8 w-64 rounded layer-1 bg-elevation-highlight" />
        <div className="h-4 w-full rounded layer-1 bg-elevation-highlight" />
        <div className="h-4 w-5/6 rounded layer-1 bg-elevation-highlight" />
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="title-2xl">{t('XtmPlatformTrial.Title')}</h1>
          <p className="text-content-base text-default-secondary">
            {t('XtmPlatformTrial.Subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ReachSalesButton variant="gradient" />
          <SlackSupportButton />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <BundleInfoSection
          bundle={bundle}
          canManage={canManage}
        />
        <div className="grid lg:col-span-2">
          <BundleGuideSection />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
