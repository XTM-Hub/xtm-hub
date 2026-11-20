'use client';
import {
  OrderingMode,
  SubscriptionFilterKey,
  SubscriptionOrdering,
  useSubscriptionsListQuery,
} from '@graphql/generated';

import Loader from '@/components/Loader';
import ServiceSlug from '@/components/service/[slug]/ServiceSlug';

import { ServiceInstanceByIdQuery } from '@/components/service/service.graphql';
import useMountingLoader from '@/hooks/use-mounting-loader';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { serviceInstanceByIdQuery } from '@generated/serviceInstanceByIdQuery.graphql';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { useMemo } from 'react';
import { useQueryLoader } from 'react-relay';

// Component interface
interface PreloaderProps {
  id: string;
}

// Component
const PageLoader = ({ id }: PreloaderProps) => {
  const [queryRefServiceInstance, loadQuery] =
    useQueryLoader<serviceInstanceByIdQuery>(ServiceInstanceByIdQuery);
  useMountingLoader(loadQuery, { service_instance_id: id });

  const variables = useMemo(
    () => ({
      count: 50,
      cursor: null,
      orderBy: SubscriptionOrdering.StartDate,
      orderMode: OrderingMode.Asc,
      searchTerm: '',
      filters: [
        {
          key: SubscriptionFilterKey.ServiceInstanceId,
          value: [id],
        },
      ],
    }),
    [id]
  );
  const { data } = useSubscriptionsListQuery(portalGraphqlClient, variables, {
    queryKey: subscriptionKeys.list(variables),
    throwOnError: throwOnFirstLoadError,
  });

  const subscriptions = useMemo(
    () => data?.subscriptions.edges.map(({ node }) => node),
    [data]
  );

  return (
    <>
      {queryRefServiceInstance && subscriptions ? (
        <ServiceSlug
          subscriptions={subscriptions}
          queryRefServiceInstance={queryRefServiceInstance}
        />
      ) : (
        <Loader />
      )}
    </>
  );
};

// Component export
export default PageLoader;
