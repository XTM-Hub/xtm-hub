import { graphql } from 'react-relay';

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
