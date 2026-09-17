import { graphql } from 'react-relay';

export const CreateDeploymentRequestMutation = graphql`
  mutation trialInstancesCreateDeploymentRequestMutation(
    $input: CreateDeploymentRequestInput!
  ) {
    createDeploymentRequest(input: $input) {
      id
      region
      type
      platform_identifier
      service_instance_id
    }
  }
`;

export const DeploymentRequestsAvailableQuery = graphql`
  query trialInstancesDeploymentRequestsAvailableQuery {
    deploymentRequestsAvailable {
      region
      availableCount
    }
  }
`;

export const CancelDeploymentRequestMutation = graphql`
  mutation trialInstancesCancelDeploymentRequestMutation(
    $deploymentRequestId: DeploymentRequestId!
    $cancellationReason: String
  ) {
    cancelDeploymentRequest(
      deploymentRequestId: $deploymentRequestId
      cancellationReason: $cancellationReason
    ) {
      id
      region
      type
      platform_identifier
      hub_status
      counts_in_orga_quota
    }
  }
`;

export const TrialsForOrgaFragment = graphql`
  fragment trialInstancesTrialsForOrgaFragment on Query
  @refetchable(queryName: "TrialsForOrgaRefetchQuery") {
    trialDeployments(input: $input) {
      availableTrials
      isBlacklisted
    }
  }
`;

export const TrialsForOrga = graphql`
  query trialInstancesTrialsForOrgaQuery($input: TrialDeploymentsInput!) {
    ...trialInstancesTrialsForOrgaFragment
  }
`;
