import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
import { useChangeSelectedOrganizationMutation } from '@graphql/generated';

export const switchOrganization = async (organization_id: string) => {
  await redirectToSignupOnUnauthenticated(async () => {
    const client = await getAuthenticatedGraphqlClient();
    return useChangeSelectedOrganizationMutation.fetcher(client, {
      organization_id,
    })();
  });
};
