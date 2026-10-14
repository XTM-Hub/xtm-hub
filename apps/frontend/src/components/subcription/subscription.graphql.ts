import { graphql } from 'react-relay';

export const subscriptionFragment = graphql`
  fragment subscription_fragment on SubscriptionModel @inline {
    id
    organization {
      name
      id
      personal_space
    }
    subscription_capability {
      id
      service_capability {
        id
        description
        name
      }
    }
    service_instance {
      id
      name
    }
    start_date
    end_date
  }
`;

export const SubscriptionDeleteMutation = graphql`
  mutation subscriptionDeleteMutation(
    $subscription_ids: [SubscriptionId!]!
    $connections: [ID!]!
  ) {
    deleteSubscriptions(subscription_ids: $subscription_ids) {
      id @deleteEdge(connections: $connections)
    }
  }
`;

export const UpdateSubscriptionInServiceMutation = graphql`
  mutation subscriptionInServiceUpdateMutation(
    $subscription_id: SubscriptionId!
    $input: UpdateSubscriptionInput!
  ) {
    updateSubscription(subscription_id: $subscription_id, input: $input) {
      ...subscription_fragment
    }
  }
`;

export const AddSubscriptionInServiceMutation = graphql`
  mutation subscriptionInServiceCreateMutation(
    $input: CreateSubscriptionsInput!
    $connections: [ID!]!
  ) {
    createSubscriptions(input: $input)
      @prependNode(
        connections: $connections
        edgeTypeName: "SubscriptionEdge"
      ) {
      ...subscription_fragment
    }
  }
`;

export const SubscriptionListQuery = graphql`
  query subscriptionListQuery(
    $count: Int!
    $cursor: ID
    $orderBy: SubscriptionOrdering!
    $orderMode: OrderingMode!
    $filters: [SubscriptionFilter!]
    $searchTerm: String
  ) {
    ...subscriptionList_fragment
  }
`;

export const subscriptionListFragment = graphql`
  fragment subscriptionList_fragment on Query
  @refetchable(queryName: "SubscriptionsPaginationQuery") {
    subscriptions(
      first: $count
      after: $cursor
      orderBy: $orderBy
      orderMode: $orderMode
      searchTerm: $searchTerm
      filters: $filters
    ) {
      __id
      totalCount
      edges {
        node {
          id
          ...subscription_fragment
        }
      }
    }
  }
`;

export const AddSubscriptionCapabilityMutation = graphql`
  mutation subscriptionAddCapabilityMutation(
    $input: AddSubscriptionCapabilityInput!
  ) {
    addSubscriptionCapability(input: $input) {
      ...subscription_fragment
    }
  }
`;

export const SubscriptionById = graphql`
  query subscriptionByIdQuery($subscriptionId: SubscriptionId) {
    subscriptionById(subscription_id: $subscriptionId) {
      id
      organization {
        id
        name
      }
      service_instance {
        id
        name
        description
        tags
        service_definition {
          service_capability {
            id
            name
            description
          }
        }
      }
      subscription_capability {
        id
        service_capability {
          id
          name
          description
        }
      }
    }
  }
`;
