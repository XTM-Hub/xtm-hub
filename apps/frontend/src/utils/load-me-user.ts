import serverPortalApiFetch from '@/relay/server-portal-api-fetch';
import MeLoaderQuery, { meLoaderQuery } from '@generated/meLoaderQuery.graphql';
import { OrganizationCapability, PortalCapability } from '@graphql/generated';

interface MeResponse {
  data: {
    me: {
      id: string;
      selected_organization_id: string;
      organizations: {
        id: string;
        name: string;
        personal_space: boolean;
      }[];
      capabilities: { name: PortalCapability }[];
      selected_org_capabilities: OrganizationCapability[];
    };
  };
}

export const loadMeUser = async () => {
  const meResponse = (await serverPortalApiFetch<
    typeof MeLoaderQuery,
    meLoaderQuery
  >(MeLoaderQuery, {}, { cache: 'no-store' })) as MeResponse;
  return meResponse.data.me ?? null;
};

export const loadCurrentUser = async () => {
  try {
    return await loadMeUser();
  } catch {
    return null;
  }
};
