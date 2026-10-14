import { graphql } from 'react-relay';

export const UserServiceFromSubscription = graphql`
  query userServiceFromSubscriptionQuery(
    $count: Int!
    $cursor: ID
    $orderBy: UserServiceOrdering!
    $orderMode: OrderingMode!
    $subscriptionId: SubscriptionId!
  ) {
    ...userServiceFromSubscription
  }
`;

export const userServiceFromSubscriptionFragment = graphql`
  fragment userServiceFromSubscription on Query
  @refetchable(queryName: "ServiceUserFromSubscriptionPaginationQuery") {
    userServiceFromSubscription(
      first: $count
      after: $cursor
      orderBy: $orderBy
      orderMode: $orderMode
      subscription_id: $subscriptionId
    ) {
      __id
      totalCount
      edges {
        node {
          id
          ...userServices_fragment
        }
      }
    }
  }
`;

export const userServicesFragment = graphql`
  fragment userServices_fragment on UserService @inline {
    id
    user {
      id
      first_name
      last_name
      email
    }
    subscription {
      service_instance {
        service_definition {
          identifier
        }
        id
        name
      }
    }
    user_service_capability {
      generic_service_capability {
        name
        id
      }
      subscription_capability {
        service_capability {
          id
          name
        }
      }
    }
  }
`;

export const UserServiceCreateMutation = graphql`
  mutation userServiceCreateMutation(
    $input: UserServiceAddInput!
    $connections: [ID!]!
    $service_instance_id: ServiceInstanceId!
  ) {
    addUserService(input: $input, service_instance_id: $service_instance_id)
      @prependNode(connections: $connections, edgeTypeName: "UserServiceEdge") {
      id
      user {
        id
        first_name
        last_name
        email
      }
      user_service_capability {
        id
        generic_service_capability {
          id
          name
        }
        subscription_capability {
          id
          service_capability {
            id
            description
            name
          }
        }
      }
      subscription {
        service_instance {
          id
        }
      }
    }
  }
`;
export const UserServiceEditMutation = graphql`
  mutation userServiceEditMutation(
    $input: UserServiceEditInput!
    $service_instance_id: ServiceInstanceId!
  ) {
    editUserService(input: $input, service_instance_id: $service_instance_id) {
      id
      user {
        id
        first_name
        last_name
        email
      }
      user_service_capability {
        id
        generic_service_capability {
          id
          name
        }
        subscription_capability {
          id
          service_capability {
            id
            description
            name
          }
        }
      }
    }
  }
`;

export const UserServiceDeleteMutation = graphql`
  mutation userServiceDeleteMutation(
    $input: UserServicesDeleteInput!
    $service_instance_id: ServiceInstanceId!
    $connections: [ID!]!
  ) {
    deleteUserServices(
      input: $input
      service_instance_id: $service_instance_id
    ) {
      id @deleteEdge(connections: $connections)
    }
  }
`;

export const UserServicesAddCapabilitiesMutation = graphql`
  mutation userServicesAddCapabilitiesMutation(
    $input: UserServicesAddCapabilitiesInput!
    $service_instance_id: ServiceInstanceId!
  ) {
    addCapabilitiesToUserServices(
      input: $input
      service_instance_id: $service_instance_id
    ) {
      id
      user_service_capability {
        id
        generic_service_capability {
          id
          name
        }
        subscription_capability {
          id
          service_capability {
            id
            name
          }
        }
      }
    }
  }
`;
