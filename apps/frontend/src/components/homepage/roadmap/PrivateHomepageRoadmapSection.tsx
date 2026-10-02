import XtmRoadmap from '@/components/homepage/roadmap/XtmRoadmap';
import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import ServiceInstancesListQuery, {
  serviceInstancesListQuery,
} from '@generated/serviceInstancesListQuery.graphql';
import {
  OrderingMode,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
  ServiceInstanceFilterKey,
  ServiceInstanceOrdering,
} from '@graphql/generated';

const PRIVATE_ROADMAP_BASE_PATH = '/app/service/xtm_platform_roadmap';

type PrivateHomepageRoadmapSectionProps = {
  platformIdentifiers: PlatformIdentifier[];
};

const PrivateHomepageRoadmapSection = async ({
  platformIdentifiers,
}: PrivateHomepageRoadmapSectionProps) => {
  const response = await serverFetchGraphQL<serviceInstancesListQuery>(
    ServiceInstancesListQuery,
    {
      count: 1,
      cursor: null,
      orderBy: ServiceInstanceOrdering.Name,
      orderMode: OrderingMode.Asc,
      filters: [
        {
          key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
          value: [ServiceDefinitionIdentifier.XtmPlatformRoadmap],
        },
      ],
      searchTerm: null,
    }
  );

  const serviceInstanceId = response.data.serviceInstances.edges[0]?.node?.id;
  if (!serviceInstanceId) {
    return null;
  }

  const homepageRoadmapTitleProduct =
    platformIdentifiers.length === 1
      ? (platformIdentifiers?.[0] ?? 'default')
      : 'default';

  const roadmapHref = `${PRIVATE_ROADMAP_BASE_PATH}/${encodeURIComponent(serviceInstanceId)}`;
  const seeMoreHref =
    homepageRoadmapTitleProduct !== 'default'
      ? `${roadmapHref}?products=${encodeURIComponent(homepageRoadmapTitleProduct)}`
      : roadmapHref;

  return (
    <XtmRoadmap
      seeMoreHref={seeMoreHref}
      titleProduct={homepageRoadmapTitleProduct}
    />
  );
};

export default PrivateHomepageRoadmapSection;
