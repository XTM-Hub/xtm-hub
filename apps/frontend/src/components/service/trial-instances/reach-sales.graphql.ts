import { graphql } from 'react-relay';

export const ReachSalesMutation = graphql`
  mutation reachSalesMutation(
    $message: String
    $platformId: ID
    $platformIdentifier: PlatformIdentifier
    $deploymentRequestType: DeploymentRequestDeploymentType
  ) {
    contactUs(
      message: $message
      platformId: $platformId
      platformIdentifier: $platformIdentifier
      deploymentRequestType: $deploymentRequestType
    ) {
      success
    }
  }
`;
