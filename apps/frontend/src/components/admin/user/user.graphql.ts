import { graphql } from 'react-relay';

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
