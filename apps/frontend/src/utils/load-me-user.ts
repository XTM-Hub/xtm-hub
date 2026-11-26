import { toPortalUser } from '@/components/me/portal-user.utils';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { getQueryClient } from '@/lib/query-client';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
import { useMeQuery } from '@graphql/generated';
import { meKeys } from '@graphql/me/me.keys';
import { QueryClient } from '@tanstack/react-query';

export const loadMeUser = async (
  queryClient: QueryClient = getQueryClient()
) => {
  const { me } = await redirectToSignupOnUnauthenticated(async () =>
    queryClient.fetchQuery({
      queryKey: meKeys.detail(),
      queryFn: useMeQuery.fetcher(await getAuthenticatedGraphqlClient()),
    })
  );
  return me ? toPortalUser(me) : null;
};

export const loadCurrentUser = async () => {
  try {
    return await loadMeUser();
  } catch {
    return null;
  }
};
