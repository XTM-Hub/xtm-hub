import { RegisteredPlatformOverview } from '@/components/service/registration/RegisteredPlatformOverview';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { getQueryClient } from '@/lib/query-client';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
import { useRegisteredPlatformByServiceInstanceQuery } from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { ComponentProps } from 'react';

type PrefetchedRegisteredPlatformOverviewProps = ComponentProps<
  typeof RegisteredPlatformOverview
>;

/**
 * Server-renders the registered platform: it is fetched with the visitor's
 * cookies under the key the overview reads, so the overview hydrates with it.
 * A platform the visitor cannot see answers the not found page.
 */
export const PrefetchedRegisteredPlatformOverview = async ({
  params,
  platformIdentifier,
}: PrefetchedRegisteredPlatformOverviewProps) => {
  const { serviceInstanceId } = await params;
  const variables = {
    input: { service_instance_id: decodeURIComponent(serviceInstanceId) },
  };
  const queryClient = getQueryClient();

  // fetchQuery, not prefetchQuery: it throws, so a failure is not left to the client.
  const { registeredPlatform } = await redirectToSignupOnUnauthenticated(
    async () =>
      queryClient.fetchQuery({
        queryKey: registrationKeys.byServiceInstance(variables),
        queryFn: useRegisteredPlatformByServiceInstanceQuery.fetcher(
          await getAuthenticatedGraphqlClient(),
          variables
        ),
      })
  );
  if (!registeredPlatform) {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RegisteredPlatformOverview
        params={params}
        platformIdentifier={platformIdentifier}
      />
    </HydrationBoundary>
  );
};
