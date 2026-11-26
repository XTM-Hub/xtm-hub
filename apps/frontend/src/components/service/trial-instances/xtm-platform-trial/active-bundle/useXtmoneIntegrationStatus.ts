'use client';

import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  useXtmonePlatformIntegrationStatusQuery,
  XtmoneIntegrationStatusFragment,
} from '@graphql/generated';

export interface XtmoneStatusState {
  data?: XtmoneIntegrationStatusFragment;
  isLoading: boolean;
  isError: boolean;
  hasUrl: boolean;
}

export const useXtmoneIntegrationStatus = (
  serviceInstanceId?: string | null
) => {
  const { data, isLoading, isError } = useXtmonePlatformIntegrationStatusQuery(
    portalGraphqlClient,
    { serviceInstanceId: serviceInstanceId ?? '' },
    {
      enabled: !!serviceInstanceId,
      retry: false,
      staleTime: 60_000,
    }
  );

  return {
    data: data?.xtmonePlatformIntegrationStatus ?? undefined,
    isLoading,
    isError,
  };
};
