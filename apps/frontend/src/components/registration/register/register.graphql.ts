import { graphql } from 'react-relay';

export const RefreshUserPlatformTokenMutation = graphql`
  mutation registerRefreshUserPlatformTokenMutation {
    refreshUserPlatformToken {
      token
    }
  }
`;

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

export const registeredPlatformByServiceInstanceId = graphql`
  query registeredPlatformByServiceInstanceIdQuery(
    $input: RegisteredPlatformInput!
  ) {
    registeredPlatform(input: $input) {
      ...registeredPlatformByServiceInstanceId_fragment
    }
  }
`;

export const registeredPlatformByServiceInstanceIdFragment = graphql`
  fragment registeredPlatformByServiceInstanceId_fragment on RegisteredPlatform {
    id
    service_instance_id
    platform_id
    last_connectivity_check
    commercial_model
    tenant_id
    title
    contract
    url
    version
    identifier
    subscription {
      start_date
      end_date
      service_instance {
        id
      }
      organization {
        id
      }
    }
    deployment_request {
      id
      hub_status
      region
      counts_in_orga_quota
      platform_identifier
      requester_email
    }
    myGroups {
      name
    }
  }
`;

export const registerRegisteredPlatformFragment = graphql`
  fragment registerRegisteredPlatformFragment on RegisteredPlatform {
    id
    title
    subscription {
      service_instance {
        id
        name
      }
    }
  }
`;
