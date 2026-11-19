'use client';

import Loader from '@/components/Loader';
import { PlatformInformation } from '@/components/service/registration/PlatformInformation';
import { PlatformMetrics } from '@/components/service/registration/PlatformMetrics';
import { PlatformMetricsAccessRequest } from '@/components/service/registration/PlatformMetricsAccessRequest';
import { getRegisteredPlatformBreadcrumbs } from '@/components/service/registration/registered-platform-overview.utils';
import { RegisteredPlatformHeader } from '@/components/service/registration/RegisteredPlatformHeader';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import useGranted from '@/hooks/use-granted';
import { useUserHasPortalCapability } from '@/hooks/use-portal-capability';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import {
  REGISTERED_PLATFORM_ORIGIN_CSM_BOARD,
  REGISTERED_PLATFORM_ORIGIN_PARAM,
} from '@/utils/path/constant';
import {
  CommercialModel,
  OrganizationCapability,
  PlatformIdentifier,
  PortalCapability,
  SaasPlatformMetricsPeriod,
  useRegisteredPlatformByServiceInstanceQuery,
  useRegisteredSaasPlatformDataQuery,
} from '@graphql/generated';
import { productInformationKeys } from '@graphql/product-information/product-information.keys';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { keepPreviousData } from '@tanstack/react-query';
import { notFound, useSearchParams } from 'next/navigation';
import { use, useState } from 'react';

// Matches the backend cache: a remount within a minute would only get the same answer back.
const SAAS_PLATFORM_DATA_STALE_TIME = 60_000;

interface RegisteredPlatformOverviewProps {
  params: Promise<{ serviceInstanceId: string }>;
  platformIdentifier: PlatformIdentifier;
}

export const RegisteredPlatformOverview = ({
  params,
  platformIdentifier,
}: RegisteredPlatformOverviewProps) => {
  const { serviceInstanceId } = use(params);
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);

  const registeredPlatformVariables = {
    input: { service_instance_id: decodedServiceInstanceId },
  };
  // Prefetched by the page: hydrated with its data, it does not load again on mount.
  const { data: registeredPlatformData } =
    useRegisteredPlatformByServiceInstanceQuery(
      portalGraphqlClient,
      registeredPlatformVariables,
      {
        queryKey: registrationKeys.byServiceInstance(
          registeredPlatformVariables
        ),
        throwOnError: throwOnFirstLoadError,
      }
    );
  const platform = registeredPlatformData?.registeredPlatform;

  const searchParams = useSearchParams();
  // Only a user who can open the CSM board is led back to it.
  const isMetricAdmin = !!useUserHasPortalCapability([
    PortalCapability.Bypass,
    PortalCapability.ReadSaasMetrics,
  ]);
  const isFromCsmBoard =
    searchParams.get(REGISTERED_PLATFORM_ORIGIN_PARAM) ===
      REGISTERED_PLATFORM_ORIGIN_CSM_BOARD && isMetricAdmin;
  const isSaas = platform?.commercial_model === CommercialModel.Saas;

  const hasRightToVisualize = !!useUserHasPortalCapability([
    PortalCapability.Bypass,
    PortalCapability.ReadSaasMetrics,
  ]);

  const canAdministrateOrganization = useGranted(
    OrganizationCapability.AdministrateOrganization
  );
  const canManagePlatformRegistration = useGranted(
    OrganizationCapability.ManagePlatformRegistration
  );
  const canSeePlatformMetrics =
    hasRightToVisualize ||
    canAdministrateOrganization ||
    canManagePlatformRegistration;

  const [metricsPeriod, setMetricsPeriod] = useState<SaasPlatformMetricsPeriod>(
    SaasPlatformMetricsPeriod.Last_90Days
  );
  const saasPlatformDataVariables = {
    input: {
      service_instance_id: decodedServiceInstanceId,
      metrics_period: metricsPeriod,
    },
  };
  const {
    data: saasPlatformData,
    isPending: isSaasPlatformDataPending,
    isPlaceholderData: isPreviousMetricsPeriodData,
  } = useRegisteredSaasPlatformDataQuery(
    portalGraphqlClient,
    saasPlatformDataVariables,
    {
      queryKey: productInformationKeys.registeredSaasPlatformData(
        saasPlatformDataVariables
      ),
      enabled: isSaas,
      staleTime: SAAS_PLATFORM_DATA_STALE_TIME,
      // The metadata does not depend on the period: keep it on screen while the metrics of another period load.
      placeholderData: keepPreviousData,
    }
  );

  if (!registeredPlatformData) {
    return <Loader />;
  }

  if (!platform) {
    notFound();
  }

  const breadcrumbs = getRegisteredPlatformBreadcrumbs({
    platformTitle: platform.title,
    isFromCsmBoard,
  });

  return (
    <>
      <BreadcrumbNav value={breadcrumbs} />
      <RegisteredPlatformHeader platform={platform} />
      {isSaas &&
        (canSeePlatformMetrics ? (
          <PlatformMetrics
            platformIdentifier={platformIdentifier}
            metrics={saasPlatformData?.registeredSaasPlatformData?.metrics}
            storage={saasPlatformData?.registeredSaasPlatformData?.storage}
            sla={saasPlatformData?.registeredSaasPlatformData?.sla}
            isLoading={isSaasPlatformDataPending || isPreviousMetricsPeriodData}
            period={metricsPeriod}
            onPeriodChange={setMetricsPeriod}
          />
        ) : (
          <PlatformMetricsAccessRequest platformTitle={platform.title} />
        ))}
      <PlatformInformation
        registeredPlatform={platform}
        showMetadata={isSaas}
        metadata={saasPlatformData?.registeredSaasPlatformData?.metadata}
        isMetadataLoading={isSaasPlatformDataPending}
      />
    </>
  );
};
