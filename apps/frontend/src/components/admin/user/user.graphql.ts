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
