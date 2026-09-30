import { graphql } from 'react-relay';

export const UserListCreateMutation = graphql`
  mutation userListCreateMutation($input: AddUserInput!, $connections: [ID!]!) {
    addUser(input: $input)
      @prependNode(connections: $connections, edgeTypeName: "UserEdge") {
      ...UserList_fragment
    }
  }
`;

export const UserSlugEditMutation = graphql`
  mutation userSlugEditMutation(
    $id: ID!
    $input: EditUserCapabilitiesInput!
    $userListConnections: [ID!]!
  ) {
    editUserCapabilities(id: $id, input: $input)
      @prependNode(
        connections: $userListConnections
        edgeTypeName: "UserEdge"
      ) {
      ...UserList_fragment
    }
  }
`;

export const userSlugFragment = graphql`
  fragment userSlug_fragment on User {
    id
    email
    last_name
    first_name
    disabled
    organizations @required(action: THROW) {
      id
      name
      personal_space
    }
    roles_portal @required(action: THROW) {
      id
      name
    }
  }
`;

export const userSlugSubscription = graphql`
  subscription userSlugSubscription {
    User {
      edit {
        ...UserList_fragment
      }
      delete {
        id @deleteRecord
      }
    }
  }
`;

export const userMeSubscription = graphql`
  subscription userMeSubscription {
    MeUser {
      delete {
        id
      }
      edit {
        ...meContext_fragment @relay(mask: false)
      }
    }
  }
`;

export const ListUsersWithCapabilitiesInOrganizationQuery = graphql`
  query userWithCapabilitiesInOrganizationQuery(
    $input: UsersWithCapabilitiesInOrganizationInput!
  ) {
    usersWithCapabilitiesInOrganization(input: $input) {
      id
      email
      first_name
      last_name
    }
  }
`;

export const UserPendingListQuery = graphql`
  query userPendingListQuery(
    $count: Int!
    $cursor: ID
    $orderBy: UserOrdering!
    $orderMode: OrderingMode!
    $filters: [Filter!]
    $searchTerm: String
  ) {
    ...userPendingList_users
  }
`;

export const UserPendingListFragment = graphql`
  fragment userPendingList_users on Query
  @refetchable(queryName: "PendingUsersPaginationQuery") {
    pendingUsers(
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
          ...UserList_fragment
        }
      }
    }
  }
`;

export const UserPendingListSubscription = graphql`
  subscription userPendingListSubscription(
    $connections: [ID!]!
    $organizationId: ID!
  ) {
    UserPending(organizationId: $organizationId) {
      delete {
        id @deleteEdge(connections: $connections)
      }
      invalidate {
        id
      }
    }
  }
`;
