import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  OrderingMode,
  ServiceDefinitionIdentifier,
  ServiceInstanceFilterKey,
  ServiceInstanceOrdering,
  ServiceInstancesListQueryVariables,
  useServiceInstancesListQuery,
} from '@graphql/generated';
import { serviceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { useMemo } from 'react';

const ROADMAP_SERVICE_INSTANCES_VARIABLES: ServiceInstancesListQueryVariables =
  {
    count: 50,
    orderBy: ServiceInstanceOrdering.Ordering,
    orderMode: OrderingMode.Asc,
    searchTerm: null,
    filters: [
      {
        key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
        value: [ServiceDefinitionIdentifier.XtmPlatformRoadmap],
      },
    ],
  };

export interface RoadmapServiceInstance {
  id: string;
  name: string;
}

/**
 * Roadmap instances a voting round can be attached to. A round always belongs
 * to the roadmap it collects feedback for.
 */
export const useRoadmapServiceInstances = (): RoadmapServiceInstance[] => {
  const { data } = useServiceInstancesListQuery(
    portalGraphqlClient,
    ROADMAP_SERVICE_INSTANCES_VARIABLES,
    {
      queryKey: serviceInstancesKeys.list(ROADMAP_SERVICE_INSTANCES_VARIABLES),
    }
  );

  return useMemo(
    () =>
      (data?.serviceInstances.edges ?? [])
        .map(({ node }) => node)
        .filter((node) => !!node)
        .map((node) => ({ id: node.id, name: node.name })),
    [data]
  );
};
