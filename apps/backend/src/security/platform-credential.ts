import {
  DeploymentRequestHubStatus,
  PlatformConfigurationStatus,
} from '../__generated__/resolvers-types';
import type DeploymentRequest from '../model/kanel/public/DeploymentRequest';
import type Organization from '../model/kanel/public/Organization';
import { OrganizationDomain } from '../modules/organization-management/organization/organization.domain';
import {
  FullPlatformConfiguration,
  PlatformConfigurationDomain,
} from '../modules/registration/platform-configuration/platform-configuration.domain';
import { validateAndGetRequestedPlatformToken } from '../modules/security-management/token/platform-token.util';

export type PlatformCredentialMatch =
  | {
      platformId: string;
      credential: 'registration';
      registration: FullPlatformConfiguration;
      organization: Organization;
    }
  | {
      platformId: string;
      credential: 'deploymentRequest';
      deploymentRequest: DeploymentRequest;
      organization: Organization;
    };

export type PlatformCredential = PlatformCredentialMatch['credential'];

export const PLATFORM_ACCEPTED_HUB_STATUSES: readonly DeploymentRequestHubStatus[] =
  [
    DeploymentRequestHubStatus.Active,
    DeploymentRequestHubStatus.Pending,
    DeploymentRequestHubStatus.Provisioning,
  ];

// activeOnly: an unregistered (inactive) registration matches nothing, so its token can only fall back
// to a deployment request. Without it, the registration matches whatever its status and the caller judges the status.
export const loadPlatformCredentialMatch = async ({
  platform_id,
  token,
  activeOnly,
}: {
  platform_id: string;
  token: string;
  activeOnly?: boolean;
}): Promise<PlatformCredentialMatch | undefined> => {
  const registration =
    await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
      { platform_id, token, activeOnly }
    );
  if (registration) {
    const { platformConfiguration } = registration;
    const organization =
      await OrganizationDomain.loadOrganizationSubscribedToServiceInstance(
        platformConfiguration.service_instance_id
      );
    if (organization) {
      return {
        platformId: platformConfiguration.platform_id,
        credential: 'registration',
        registration,
        organization,
      };
    }
  }

  const deploymentRequest = await validateAndGetRequestedPlatformToken({
    platform_id,
    token,
  });
  if (!deploymentRequest || deploymentRequest.platform_id === null) {
    return undefined;
  }

  const organization = await OrganizationDomain.loadOrganizationBy({
    id: deploymentRequest.organization_requester_id,
  });
  if (!organization) {
    return undefined;
  }
  return {
    platformId: deploymentRequest.platform_id,
    credential: 'deploymentRequest',
    deploymentRequest,
    organization,
  };
};

export const isAcceptedPlatformMatch = (
  match: PlatformCredentialMatch
): boolean =>
  match.credential === 'registration'
    ? match.registration.platformConfiguration.status ===
      PlatformConfigurationStatus.Active
    : PLATFORM_ACCEPTED_HUB_STATUSES.includes(
        match.deploymentRequest.hub_status
      );
