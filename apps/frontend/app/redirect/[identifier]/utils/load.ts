import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
import serverPortalApiFetch from '@/relay/server-portal-api-fetch';
import { SettingsResponse } from '@/utils/settings.service';
import SettingsQuery, { settingsQuery } from '@generated/settingsQuery.graphql';
import {
  OrderingMode,
  ServiceInstanceFilterKey,
  ServiceInstanceOrdering,
  usePlatformAssociatedOrganizationQuery,
  useServiceInstancesListQuery,
} from '@graphql/generated';

export const loadBaseUrlFront = async () => {
  const settingsResponse = (await serverPortalApiFetch<
    typeof SettingsQuery,
    settingsQuery
  >(SettingsQuery)) as SettingsResponse;
  return settingsResponse.data.settings.base_url_front;
};

export const loadPlatformOrganizationId = async (
  platformId?: string | null,
  tenantId?: string | null
): Promise<string | undefined> => {
  if (!platformId) {
    return;
  }

  try {
    const client = await getAuthenticatedGraphqlClient();
    const data = await usePlatformAssociatedOrganizationQuery.fetcher(client, {
      platformId,
      tenantId: tenantId ?? null,
    })();

    return data.platformAssociatedOrganization?.id;
  } catch {
    // Expected when the platform is unknown or not shared with the user:
    // the redirect falls back to the selected organization.
  }
};

export const loadServiceInstances = async (identifier: string) => {
  const data = await redirectToSignupOnUnauthenticated(async () => {
    const client = await getAuthenticatedGraphqlClient();
    return useServiceInstancesListQuery.fetcher(client, {
      count: 50,
      orderBy: ServiceInstanceOrdering.Ordering,
      orderMode: OrderingMode.Asc,
      filters: [
        {
          key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
          value: [identifier],
        },
      ],
      searchTerm: null,
    })();
  });

  return data.serviceInstances.edges
    .map((edge) => edge.node)
    .filter((node) => node != null);
};
