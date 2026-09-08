import { graphql } from 'react-relay';

export const ServiceAddPicture = graphql`
  mutation serviceAddPictureMutation(
    $serviceInstanceId: ServiceInstanceId!
    $document: Upload
    $isLogo: Boolean!
  ) {
    addServicePicture(
      serviceInstanceId: $serviceInstanceId
      document: $document
      isLogo: $isLogo
    ) {
      id
      name
    }
  }
`;

export const UpdatePlatformServiceMetadata = graphql`
  mutation serviceUpdatePlatformServiceMetadataMutation(
    $input: UpdatePlatformServiceMetadataInput!
  ) {
    updatePlatformServiceMetadata(input: $input) {
      ...registerRegisteredPlatformFragment
    }
  }
`;

export const ServiceById = graphql`
  query serviceByIdQuery($service_instance_id: ServiceInstanceId!) {
    serviceInstanceById(service_instance_id: $service_instance_id) {
      ...serviceInstance_fragment
    }
  }
`;
export const serviceInstanceFragment = graphql`
  fragment serviceInstance_fragment on ServiceInstance {
    id
    name
    description
    slug
    capabilities
    service_definition {
      identifier
    }
  }
`;
export const serviceListFragment = graphql`
  fragment serviceList_fragment on ServiceInstance {
    id
    name
    description
    creation_status
    capabilities
    public
    tags
    links {
      name
      url
    }
    service_definition {
      id
      name
      identifier
    }
    logo_document_id
    illustration_document_id
    slug
    ordering
  }
`;

export const subscription = graphql`
  subscription serviceListSubscription($connections: [ID!]!) {
    ServiceInstance {
      add
        @prependNode(
          connections: $connections
          edgeTypeName: "ServiceInstanceEdge"
        ) {
        ...serviceList_fragment
      }
      edit {
        ...serviceList_fragment
      }
      delete {
        id @deleteRecord
      }
    }
  }
`;

export const servicesListFragment = graphql`
  fragment servicesList_services on Query
  @refetchable(queryName: "ServicesPaginationQuery") {
    serviceInstances(
      first: $count
      after: $cursor
      orderBy: $orderBy
      orderMode: $orderMode
      searchTerm: $searchTerm
      filters: $filters
      includeInaccessible: $includeInaccessible
    ) {
      __id
      totalCount
      edges {
        node {
          id
          ...serviceList_fragment @relay(mask: false)
        }
      }
    }
  }
`;

export const ServiceListQuery = graphql`
  query serviceQuery(
    $count: Int!
    $cursor: ID
    $orderBy: ServiceInstanceOrdering!
    $orderMode: OrderingMode!
    $filters: [ServiceInstanceFilter!]
    $searchTerm: String
    $includeInaccessible: Boolean
  ) {
    ...servicesList_services
  }
`;

export const ServiceInstanceByIdQuery = graphql`
  query serviceInstanceByIdQuery($service_instance_id: ServiceInstanceId!) {
    serviceInstanceById(service_instance_id: $service_instance_id) {
      ...serviceInstanceForSubscriptions_fragment
    }
  }
`;

export const serviceInstanceForSubscriptionsFragment = graphql`
  fragment serviceInstanceForSubscriptions_fragment on ServiceInstance @inline {
    __id
    name
    id
    description
    tags
    service_definition {
      service_capability {
        id
        description
        name
      }
    }
  }
`;

export const ServiceLinksByTagsQuery = graphql`
  query serviceLinksByTagsQuery($tags: [ServiceInstanceTag!]!) {
    serviceInstanceLinksByTags(tags: $tags) {
      ...seoServiceInstanceFragment
    }
  }
`;
