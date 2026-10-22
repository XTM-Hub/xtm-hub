'use client';

import {
  registeredPlatformByServiceInstanceId,
  registeredPlatformByServiceInstanceIdFragment,
} from '@/components/registration/register/register.graphql';
import { PlatformInformation } from '@/components/service/registration/PlatformInformation';
import { PlatformMetrics } from '@/components/service/registration/PlatformMetrics';
import { RegisteredPlatformHeader } from '@/components/service/registration/RegisteredPlatformHeader';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { useUserHasPortalCapability } from '@/hooks/use-portal-capability';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { registeredPlatformByServiceInstanceIdQuery } from '@generated/registeredPlatformByServiceInstanceIdQuery.graphql';
import {
  CommercialModel,
  FeatureFlag,
  PortalCapability,
  useRegisteredSaasPlatformDataQuery,
} from '@graphql/generated';
import { productInformationKeys } from '@graphql/product-information/product-information.keys';
import { notFound } from 'next/navigation';
import { use } from 'react';
import { useFragment, useLazyLoadQuery } from 'react-relay';

// Matches the backend cache: a remount within a minute would only get the same answer back.
const SAAS_PLATFORM_DATA_STALE_TIME = 60_000;

interface RegisteredPlatformOverviewProps {
  params: Promise<{ serviceInstanceId: string }>;
}

export const RegisteredPlatformOverview = ({
  params,
}: RegisteredPlatformOverviewProps) => {
  const { serviceInstanceId } = use(params);
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);

  const queryData =
    useLazyLoadQuery<registeredPlatformByServiceInstanceIdQuery>(
      registeredPlatformByServiceInstanceId,
      {
        input: {
          service_instance_id: decodedServiceInstanceId,
        },
      }
    );
  const platform =
    useFragment<registeredPlatformByServiceInstanceId_fragment$key>(
      registeredPlatformByServiceInstanceIdFragment,
      queryData.registeredPlatform
    );

  const canReadSaasMetrics = !!useUserHasPortalCapability([
    PortalCapability.Bypass,
    PortalCapability.ReadSaasMetrics,
  ]);
  const isSaasMetricsEnabled = useIsFeatureEnabled(FeatureFlag.SaasMetrics);
  const isSaas = platform?.commercial_model === CommercialModel.Saas;
  const showSaasPlatformData =
    isSaasMetricsEnabled && isSaas && canReadSaasMetrics;

  const saasPlatformDataVariables = {
    input: { service_instance_id: decodedServiceInstanceId },
  };
  const { data: saasPlatformData, isPending: isSaasPlatformDataPending } =
    useRegisteredSaasPlatformDataQuery(
      portalGraphqlClient,
      saasPlatformDataVariables,
      {
        queryKey: productInformationKeys.registeredSaasPlatformData(
          saasPlatformDataVariables
        ),
        enabled: showSaasPlatformData,
        staleTime: SAAS_PLATFORM_DATA_STALE_TIME,
      }
    );

  if (!queryData.registeredPlatform || !platform) {
    notFound();
  }

  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: platform.title,
      original: true,
    },
  ];

  return (
    <>
      <BreadcrumbNav value={breadcrumbs} />
      <RegisteredPlatformHeader
        registeredPlatform={queryData.registeredPlatform}
      />
      {showSaasPlatformData && (
        <PlatformMetrics
          metrics={saasPlatformData?.registeredSaasPlatformData?.metrics}
          isLoading={isSaasPlatformDataPending}
        />
      )}
      <PlatformInformation
        registeredPlatform={queryData.registeredPlatform}
        showMetadata={showSaasPlatformData}
        metadata={saasPlatformData?.registeredSaasPlatformData?.metadata}
        isMetadataLoading={isSaasPlatformDataPending}
      />
    </>
  );
};
