'use client';
import {
  OrderingMode,
  SubscriptionFilterKey,
  SubscriptionOrdering,
  useServiceInstanceWithCapabilitiesByIdQuery,
  useSubscriptionsListQuery,
} from '@graphql/generated';

import Loader from '@/components/Loader';
import ServiceSlug from '@/components/service/[slug]/ServiceSlug';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { serviceInstanceWithCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { useMemo } from 'react';

// Component interface
interface PreloaderProps {
  id: string;
}

// Component
const PageLoader = ({ id }: PreloaderProps) => {
  const serviceInstanceVariables = useMemo(
    () => ({ service_instance_id: id }),
    [id]
  );
  const { data: serviceInstanceData } =
    useServiceInstanceWithCapabilitiesByIdQuery(
      portalGraphqlClient,
      serviceInstanceVariables,
      {
        queryKey: serviceInstanceWithCapabilitiesKeys.byId(
          serviceInstanceVariables
        ),
        throwOnError: throwOnFirstLoadError,
      }
    );

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

  // The API answers an unknown service instance with an error, never `null`.
  const serviceInstance = serviceInstanceData?.serviceInstanceById;
  if (!serviceInstance || !subscriptions) {
    return <Loader />;
  }

  return (
    <ServiceSlug
      subscriptions={subscriptions}
      serviceInstance={serviceInstance}
    />
  );
};

// Component export
export default PageLoader;
