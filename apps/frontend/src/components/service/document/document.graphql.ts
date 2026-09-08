import { graphql } from 'react-relay';

export const DocumentCreateMutation = graphql`
  mutation documentCreateMutation(
    $input: CreateDocumentInput!
    $metadata: [DocumentMetadata!]!
    $serviceInstanceId: ServiceInstanceId!
    $connections: [ID!]!
    $sourceDocument: Upload
    $logo: Upload
    $images: [Upload!]
  ) {
    createDocument(
      input: $input
      metadata: $metadata
      serviceInstanceId: $serviceInstanceId
      sourceDocument: $sourceDocument
      logo: $logo
      images: $images
    ) @prependNode(connections: $connections, edgeTypeName: "DocumentEdge") {
      __id
      name
      ...documentItem_fragment
    }
  }
`;

export const DocumentUpdateMutation = graphql`
  mutation documentUpdateMutation(
    $documentId: DocumentId!
    $input: UpdateDocumentInput!
    $metadata: [DocumentMetadata!]!
    $sourceDocument: Upload
    $existingImageIds: [DocumentId!]
    $serviceInstanceId: ServiceInstanceId!
    $logo: Upload
    $images: [Upload!]
  ) {
    updateDocument(
      documentId: $documentId
      input: $input
      sourceDocument: $sourceDocument
      metadata: $metadata
      existingImageIds: $existingImageIds
      serviceInstanceId: $serviceInstanceId
      logo: $logo
      images: $images
    ) {
      __id
      ...documentItem_fragment
    }
  }
`;

export const DocumentDeleteMutation = graphql`
  mutation documentDeleteMutation(
    $documentId: DocumentId!
    $connections: [ID!]!
    $serviceInstanceId: ServiceInstanceId!
    $forceDelete: Boolean
  ) {
    deleteDocument(
      documentId: $documentId
      service_instance_id: $serviceInstanceId
      forceDelete: $forceDelete
    ) {
      id @deleteEdge(connections: $connections)
    }
  }
`;

export const DocumentExistsQuery = graphql`
  query documentExistsQuery(
    $documentName: String
    $serviceInstanceId: ServiceInstanceId!
  ) {
    documentExists(
      documentName: $documentName
      service_instance_id: $serviceInstanceId
    )
  }
`;

export const documentItem = graphql`
  fragment documentItem_fragment on Document @inline {
    __typename
    id
    type
    file_name
    created_at
    name
    short_description
    description
    download_number
    share_number
    active
    updated_at
    use_cases {
      id
      name
      color
    }
    uploader {
      id
      email
      first_name
      last_name
      picture
    }
    uploader_organization {
      id
      name
      personal_space
    }
    children_documents {
      id
      file_name
      created_at
      name
      description
      download_number
      active
      source_type
      image_type
    }
    slug
    service_instance {
      id
      slug
    }
    subscription {
      id
    }

    ... on CustomDashboard {
      product_version
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

    ... on OpenCTIPlaybook {
      product_version
    }

    ... on CustomView {
      product_version
      entity_types
    }
  }
`;

export const documentsFragment = graphql`
  fragment documentsList on Query
  @refetchable(queryName: "DocumentsPaginationQuery") {
    documents(
      first: $count
      after: $cursor
      orderBy: $orderBy
      orderMode: $orderMode
      searchTerm: $searchTerm
      logicalFilters: $logicalFilters
      serviceInstanceId: $serviceInstanceId
      parentsOnly: $parentsOnly
    ) {
      __id
      totalCount
      edges {
        node {
          id
          active
          ...documentItem_fragment
        }
      }
    }
  }
`;

export const DocumentsListQuery = graphql`
  query documentsQuery(
    $count: Int!
    $cursor: ID
    $orderBy: DocumentOrdering!
    $orderMode: OrderingMode!
    $logicalFilters: LogicalFilterInput
    $searchTerm: String
    $serviceInstanceId: ServiceInstanceId!
    $parentsOnly: Boolean
  ) {
    ...documentsList
  }
`;

export const DocumentsItemQuery = graphql`
  query documentQuery(
    $documentId: DocumentId!
    $serviceInstanceId: ServiceInstanceId!
  ) {
    document(documentId: $documentId, serviceInstanceId: $serviceInstanceId) {
      ...documentItem_fragment
    }
  }
`;
