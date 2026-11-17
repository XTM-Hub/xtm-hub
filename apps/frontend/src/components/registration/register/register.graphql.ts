import { graphql } from 'react-relay';

export const IsPlatformRegisteredFragment = graphql`
  fragment registerIsPlatformRegisteredFragment on IsPlatformRegisteredResponse {
    status
    platformTitle
    organization {
      id
    }
  }
`;

export const IsPlatformRegisteredQuery = graphql`
  query registerIsPlatformRegisteredQuery($input: IsPlatformRegisteredInput!) {
    isPlatformRegistered(input: $input) {
      ...registerIsPlatformRegisteredFragment
    }
  }
`;

export const CanUnregisterPlatformFragment = graphql`
  fragment registerCanUnregisterPlatformFragment on CanUnregisterResponse {
    isPlatformRegistered
    isAllowed
    isInOrganization
    organizationId
    organizationName
  }
`;

export const CanUnregisterPlatformQuery = graphql`
  query registerCanUnregisterPlatformQuery(
    $input: CanUnregisterPlatformInput!
  ) {
    canUnregisterPlatform(input: $input) {
      ...registerCanUnregisterPlatformFragment
    }
  }
`;

export const RegisterFragment = graphql`
  fragment registerFragment on RegistrationResponse {
    token
  }
`;

export const RegisterPlatform = graphql`
  mutation registerPlatformMutation($input: RegisterPlatformInput!) {
    registerPlatform(input: $input) {
      ...registerFragment
    }
  }
`;

export const UnregisterFragment = graphql`
  fragment registerUnregisterFragment on Success {
    success
  }
`;

export const UnregisterPlatform = graphql`
  mutation registerUnregisterPlatformMutation(
    $input: UnregisterPlatformInput!
  ) {
    unregisterPlatform(input: $input) {
      ...registerUnregisterFragment
    }
  }
`;
