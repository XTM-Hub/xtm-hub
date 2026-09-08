import { graphql } from 'react-relay';

export const publicDocumentListItem = graphql`
  fragment publicDocumentListItemFragment on Document @inline {
    __typename
    id
    name
    short_description
    slug
    children_documents {
      id
      image_type
    }
    use_cases {
      id
      name
      color
    }
    uploader {
      first_name
      last_name
      picture
    }
    active
    type

    ... on Integration {
      integration_type
    }

    ... on Connector {
      product_version
      version
      verified
      manager_supported
    }

    ... on CustomView {
      entity_types
    }
  }
`;

export const publicDocumentByServiceSlugItem = graphql`
  fragment publicDocumentByServiceSlugItemFragment on Document @inline {
    __typename
    id
    name
    description
    short_description
    created_at
    updated_at
    slug
    download_number
    share_number
    children_documents {
      id
      image_type
      source_type
    }
    use_cases {
      id
      name
      color
    }
    uploader {
      first_name
      last_name
      picture
    }
    active
    type
    uploader_organization {
      id
      personal_space
      name
    }

    ... on Integration {
      integration_type
      datasheet_url
      blogpost_url
      demo_url
      solution_categories {
        id
        name
      }
      license_type
    }

    ... on CustomDashboard {
      product_version
    }

    ... on CsvFeed {
      feed_url
    }

    ... on TaxiiFeed {
      feed_url
    }

    ... on RssFeed {
      feed_url
    }

    ... on Stream {
      feed_url
    }

    ... on ThirdPartyIntegration {
      product_version
      vendor_url
      github_url
    }

    ... on Connector {
      product_version
      version
      container_image
      verified
      source_code
      subscription_link
      manager_supported
      playbook_supported
      minimum_deployable_version
      contact
    }

    ... on OpenAEVScenario {
      product_version
    }

    ... on CustomView {
      product_version
      entity_types
    }
  }
`;

export const publicDocumentBySlugItem = graphql`
  fragment publicDocumentBySlugItemFragment on Document @inline {
    __typename
    id
    name
    description
    short_description
    created_at
    updated_at
    slug
    download_number
    share_number
    children_documents {
      id
      image_type
      source_type
    }
    use_cases {
      id
      name
      color
    }
    uploader {
      id
      first_name
      last_name
      picture
    }
    active
    type
    uploader_organization {
      id
      personal_space
      name
    }

    ... on Integration {
      integration_type
      datasheet_url
      blogpost_url
      demo_url
      solution_categories {
        id
        name
      }
      license_type
    }

    ... on CustomDashboard {
      product_version
    }

    ... on CsvFeed {
      feed_url
    }

    ... on TaxiiFeed {
      feed_url
    }

    ... on RssFeed {
      feed_url
    }

    ... on Stream {
      feed_url
    }

    ... on ThirdPartyIntegration {
      product_version
      vendor_url
      github_url
    }

    ... on Connector {
      product_version
      version
      container_image
      verified
      source_code
      subscription_link
      manager_supported
      playbook_supported
      minimum_deployable_version
      contact
    }

    ... on OpenAEVScenario {
      product_version
    }

    ... on CustomView {
      product_version
      entity_types
    }
  }
`;

export const PublicDocumentListFragment = graphql`
  fragment publicDocumentList on Query
  @refetchable(queryName: "PublicDocumentListQuery") {
    publicDocuments(
      slug: $slug
      first: $count
      after: $cursor
      orderBy: $orderBy
      orderMode: $orderMode
      logicalFilters: $logicalFilters
      searchTerm: $searchTerm
      serviceInstanceId: $serviceInstanceId
    ) {
      __id
      totalCount
      edges {
        node {
          ...publicDocumentListItemFragment
        }
      }
    }
  }
`;

export const PublicDocumentListQuery = graphql`
  query publicDocumentsQuery(
    $slug: String!
    $count: Int!
    $cursor: ID
    $orderBy: DocumentOrdering!
    $orderMode: OrderingMode!
    $logicalFilters: LogicalFilterInput
    $searchTerm: String
    $serviceInstanceId: ServiceInstanceId!
  ) {
    ...publicDocumentList
  }
`;

export const PublicDocumentsByServiceSlugQuery = graphql`
  query publicDocumentsByServiceSlugQuery($serviceInstanceSlug: String!) {
    publicDocumentsByServiceSlug(serviceInstanceSlug: $serviceInstanceSlug) {
      ...publicDocumentByServiceSlugItemFragment
    }
  }
`;

export const PublicDocumentBySlugQuery = graphql`
  query publicDocumentBySlugQuery(
    $serviceInstanceId: ServiceInstanceId!
    $slug: String!
  ) {
    publicDocumentBySlug(serviceInstanceId: $serviceInstanceId, slug: $slug) {
      ...publicDocumentBySlugItemFragment
    }
  }
`;
