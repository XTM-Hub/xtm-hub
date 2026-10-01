import { graphql } from 'react-relay';

export const MeContextFragment = graphql`
  fragment meContext_fragment on User {
    id
    email
    first_name
    last_name
    country
    selected_language
    picture
    selected_organization_id @required(action: THROW)
    capabilities @required(action: THROW) {
      name
    }
    roles_portal @required(action: THROW) {
      id
    }
    organizations @required(action: THROW) {
      id
      name
      personal_space
    }
    selected_org_capabilities
    has_replied_satisfaction
  }
`;

export const MeResetPasswordMutation = graphql`
  mutation meResetPasswordMutation {
    resetPassword {
      success
    }
  }
`;

export const MeRequestTransferPersonalSpaceMutation = graphql`
  mutation meRequestTransferPersonalSpaceMutation($new_email: String!) {
    requestTransferPersonalSpace(new_email: $new_email) {
      success
    }
  }
`;
export const MeTransferPersonalSpaceMutation = graphql`
  mutation meTransferPersonalSpaceMutation($requestId: ID!) {
    transferPersonalSpace(requestId: $requestId) {
      success
    }
  }
`;

export const MeEditUserMutation = graphql`
  mutation meEditUserMutation(
    $first_name: String
    $last_name: String
    $country: String
    $selected_language: String
  ) {
    editMeUser(
      input: {
        first_name: $first_name
        last_name: $last_name
        country: $country
        selected_language: $selected_language
      }
    ) {
      ...meContext_fragment
    }
  }
`;

export const MeUploadUserPictureMutation = graphql`
  mutation meUploadUserPictureMutation($document: Upload!) {
    uploadUserPicture(document: $document) {
      ...meContext_fragment
    }
  }
`;

// Configuration or Preloader Query
export const MeQuery = graphql`
  query meLoaderQuery {
    me {
      ...meContext_fragment
    }
  }
`;
