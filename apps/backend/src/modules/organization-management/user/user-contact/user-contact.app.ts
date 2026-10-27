import { validate as isUuid } from 'uuid';
import {
  DeploymentRequestDeploymentType,
  PlatformConfigurationStatus,
  PlatformIdentifier,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { UserLoadUserBy } from '../../../../model/user';
import {
  hubspotReachOutSalesHook,
  type ReachOutSalesPayload,
} from '../../../../thirdparty/hubspot/hubspot';
import { ErrorCode } from '../../../../utils/error/error.code';
import {
  DeploymentRequestDomain,
  FullyQualifiedDeploymentRequest,
} from '../../../deployment/deployment.domain';
import { PlatformConfigurationDomain } from '../../../registration/platform-configuration/platform-configuration.domain';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';

const DEFAULT_MESSAGE = 'Please contact me about the OpenCTI free trial';

const buildTrialContact = (
  deploymentRequest: FullyQualifiedDeploymentRequest,
  message: string
): ReachOutSalesPayload => ({
  email: deploymentRequest.requester_email,
  firstname: deploymentRequest.requester_first_name,
  lastname: deploymentRequest.requester_last_name,
  company: deploymentRequest.organization_name,
  message: `${deploymentRequest.platform_identifier}: Message sent for free trial: ${deploymentRequest.hub_status.toLowerCase()} ${deploymentRequest.type}.\n\n${message}`,
});

const isRequestedByUserOrganization = (
  user: UserLoadUserBy,
  deploymentRequest: FullyQualifiedDeploymentRequest
) =>
  user.organizations.some(
    (organization) =>
      organization.id === deploymentRequest.organization_requester_id
  );

/**
 * Resolves the contact of a signed-in Hub user: the requester of the trial they name, or the user themselves, with
 * the products of their latest bundle in the message when they ask about a bundle.
 * A trial from another organization is refused like a missing one, so its existence is not disclosed.
 */
const loadHubUserContact = async ({
  message,
  platformId,
  platformIdentifier,
  platformToken,
  deploymentRequestType,
}: {
  message: string;
  platformId?: string;
  platformIdentifier: PlatformIdentifier;
  platformToken?: string;
  deploymentRequestType?: DeploymentRequestDeploymentType;
}): Promise<ReachOutSalesPayload> => {
  const user = requestContext.requireUser();

  if (platformId) {
    const deploymentRequest =
      await DeploymentRequestDomain.loadFullDeploymentRequest({
        platform_id: platformId,
      });
    if (
      !deploymentRequest ||
      deploymentRequest.type !== DeploymentRequestDeploymentType.Trial ||
      !isRequestedByUserOrganization(user, deploymentRequest)
    ) {
      throw new Error(ErrorCode.DeploymentRequestNotFound);
    }
    return buildTrialContact(deploymentRequest, message);
  }

  if (platformToken) {
    const deploymentRequest =
      await DeploymentRequestDomain.loadTrialDeploymentRequestByPlatformToken(
        platformToken
      );
    if (
      !deploymentRequest ||
      !isRequestedByUserOrganization(user, deploymentRequest)
    ) {
      throw new Error(ErrorCode.InvalidPlatformToken);
    }
    return buildTrialContact(deploymentRequest, message);
  }

  // Without a platform, the contact is the sender, never another member of their organizations.
  const sender = {
    email: user.email,
    firstname: user.first_name,
    lastname: user.last_name,
    company:
      user.organizations.find((org) => org.id === user.selected_organization_id)
        ?.name || '',
  };

  if (deploymentRequestType === DeploymentRequestDeploymentType.Bundle) {
    const bundle =
      await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
        user.id,
        { type: DeploymentRequestDeploymentType.Bundle }
      );
    if (bundle) {
      const children = await DeploymentRequestDomain.loadChildrenByParentIds([
        bundle.id,
      ]);
      const products = children
        .map((child) => child.platform_identifier)
        .filter((identifier): identifier is PlatformIdentifier =>
          Boolean(identifier)
        );
      return {
        ...sender,
        message: `${products.join(', ')}: Message sent for free trial: ${bundle.hub_status.toLowerCase()} ${bundle.type}.\n\n${message}`,
      };
    }
  }

  return { ...sender, message: `${platformIdentifier}: ${message}` };
};

/**
 * Resolves the contact of a platform calling without a Hub session: the requester of its trial deployment, or the
 * user who registered it. Throws when the platform id and token match neither, so the caller gets a real error.
 */
const loadPlatformContact = async ({
  message,
  platformId,
  platformToken,
}: {
  message: string;
  platformId: string;
  platformToken: string;
}): Promise<ReachOutSalesPayload> => {
  const trialRequest =
    await DeploymentRequestDomain.loadTrialDeploymentRequestByPlatformToken(
      platformToken
    );
  if (
    trialRequest &&
    (!trialRequest.platform_id || trialRequest.platform_id === platformId)
  ) {
    return buildTrialContact(trialRequest, message);
  }

  // A registration is keyed by UUID columns: any other value is refused here, before the database rejects it.
  if (!isUuid(platformId) || !isUuid(platformToken)) {
    throw new Error(ErrorCode.InvalidPlatformToken);
  }
  const registration =
    await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
      { platform_id: platformId, token: platformToken }
    );
  if (
    registration?.platformConfiguration.status ===
    PlatformConfigurationStatus.Active
  ) {
    const { platformConfiguration, platformIdentifier } = registration;
    const [registerer, organization] = await Promise.all([
      UserDomain.loadUserBy({
        'User.id': platformConfiguration.registerer_id,
      }),
      OrganizationDomain.loadOrganizationSubscribedToServiceInstance(
        platformConfiguration.service_instance_id
      ),
    ]);
    if (registerer) {
      return {
        email: registerer.email,
        firstname: registerer.first_name,
        lastname: registerer.last_name,
        company: organization?.name ?? '',
        message: `${platformIdentifier}: ${message}`,
      };
    }
  }

  throw new Error(ErrorCode.InvalidPlatformToken);
};

export const UserContactApp = {
  /**
   * Sends the message of a signed-in Hub user to sales. Throws when the trial it names can't be resolved; the
   * delivery itself is best effort.
   */
  contactSales: async ({
    message = DEFAULT_MESSAGE,
    platformIdentifier = PlatformIdentifier.Opencti,
    ...input
  }: {
    message?: string;
    platformId?: string;
    platformIdentifier?: PlatformIdentifier;
    platformToken?: string;
    deploymentRequestType?: DeploymentRequestDeploymentType;
  }) => {
    const contact = await loadHubUserContact({
      message,
      platformIdentifier,
      ...input,
    });
    await hubspotReachOutSalesHook(contact);
  },

  /**
   * Sends the message of a platform calling with its own id and token to sales. Throws when they match no trial or
   * registration; the delivery itself is best effort.
   */
  contactSalesFromPlatform: async ({
    message = DEFAULT_MESSAGE,
    platformId,
    platformToken,
  }: {
    message?: string;
    platformId: string;
    platformToken: string;
  }) => {
    const contact = await loadPlatformContact({
      message,
      platformId,
      platformToken,
    });
    await hubspotReachOutSalesHook(contact);
  },
};
