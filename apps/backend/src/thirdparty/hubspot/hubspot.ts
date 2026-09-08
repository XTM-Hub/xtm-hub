import config from 'config';
import {
  DeploymentRequestDeploymentType,
  OrganizationCapability,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { UserId } from '../../model/kanel/public/User';
import {
  DeploymentRequestDomain,
  FullyQualifiedDeploymentRequest,
} from '../../modules/deployment/deployment.domain';
import { UserDomain } from '../../modules/organization-management/user/user-domain/user.domain';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode } from '../../utils/error/error.code';
import { isValidUrl } from '../../utils/utils';
import {
  HUBSPOT_TYPE_TO_QUEUE,
  type HubspotPayloadMap,
  type HubspotWebhookType,
} from '../pgboss/hubspot.jobs';
import { PgBossProducer } from '../pgboss/producer';

/**
 * Toggle between queue-based processing (PgBoss with retries) and live/direct sending.
 */
const useQueueProcessing = (): boolean =>
  config.get<boolean>('hubspot_use_queue_processing');

export async function hubspotHook<T extends HubspotWebhookType>(
  type: T,
  buildPayload: () => Promise<HubspotPayloadMap[T]>
) {
  try {
    const payload = await buildPayload();
    if (useQueueProcessing()) {
      try {
        const queueName = HUBSPOT_TYPE_TO_QUEUE[type];
        await PgBossProducer.send(queueName, { type, payload });
      } catch (error) {
        logApp.error(`Failed to enqueue Hubspot ${type} job`, { error });
      }
      return;
    }

    hubspotWebhookSend(type, payload).catch((error) => {
      logApp.error(`Failed to send Hubspot ${type} hook synchronously`, {
        error,
      });
    });
  } catch (error) {
    logApp.error(`Failed to send Hubspot ${type} hook`, { error });
  }
}

/**
 * Called by PgBoss workers to actually send the webhook.
 * Throws on failure so PgBoss can retry.
 */
export async function hubspotWebhookSend<T extends HubspotWebhookType>(
  type: T,
  payload: HubspotPayloadMap[T]
) {
  const webHookUrl = config.get<string>('hubspot_webhook_url');
  if (!isValidUrl(webHookUrl)) {
    logApp.debug(`Hubspot ${type} hook skipped: invalid or empty webhook URL`);
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(webHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        ...payload,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `HubSpot webhook returned HTTP ${response.status}: ${body}`
      );
    }

    logApp.info(`Hubspot ${type} hook sent`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const hubspotLoginHook = async (userId: string) =>
  hubspotHook('login', async () => {
    const user = await UserDomain.loadUserBy({ 'User.id': userId as UserId });
    if (!user) {
      throw new Error(ErrorCode.UserNotFound);
    }
    const is_admin = (user.organization_capabilities ?? []).some(
      (orga_capa) => {
        return (
          !orga_capa.organization.personal_space &&
          orga_capa.capabilities.some((capa) =>
            [OrganizationCapability.AdministrateOrganization].includes(capa)
          )
        );
      }
    );

    return {
      email: user.email,
      first_login: user.last_login === null,
      last_login: user.last_login,
      is_admin,
    };
  });

export const hubspotReachOutSalesHook = async ({
  message = 'Please contact me about the OpenCTI free trial',
  platformId,
  platformIdentifier = PlatformIdentifier.Opencti,
  platformToken,
  deploymentRequestType,
}: {
  message?: string;
  platformIdentifier?: PlatformIdentifier;
  platformId?: string;
  platformToken?: string;
  deploymentRequestType?: DeploymentRequestDeploymentType;
}) =>
  hubspotHook('reachOutSales', async () => {
    const user = requestContext.requireUser();

    let deploymentRequest: FullyQualifiedDeploymentRequest | undefined;
    if (platformId) {
      deploymentRequest =
        await DeploymentRequestDomain.loadFullDeploymentRequest({
          platform_id: platformId,
        });

      if (!deploymentRequest) {
        throw new Error(
          `No deployment request found for platform id: ${platformId}`
        );
      }

      if (deploymentRequest.type !== DeploymentRequestDeploymentType.Trial) {
        throw new Error(
          `Deployment request ${deploymentRequest.id} is not a trial deployment request`
        );
      }
      const request = deploymentRequest;
      const hasUserRightsOnRequest = user.organizations.some(
        (organization) => organization.id === request.organization_requester_id
      );
      if (!hasUserRightsOnRequest) {
        throw new Error(
          `Deployment request ${deploymentRequest.id}, organization ${deploymentRequest.organization_requester_id} does not match user ${user.id} organizations`
        );
      }
    } else if (platformToken) {
      deploymentRequest =
        await DeploymentRequestDomain.loadTrialDeploymentRequestByPlatformToken(
          platformToken
        );
      if (!deploymentRequest) {
        throw new Error(
          `No deployment request found for platform token: ${platformToken}`
        );
      }
    } else if (user?.id) {
      if (deploymentRequestType === DeploymentRequestDeploymentType.Bundle) {
        const bundle =
          await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
            user.id,
            { type: DeploymentRequestDeploymentType.Bundle }
          );
        if (bundle) {
          const children =
            await DeploymentRequestDomain.loadChildrenByParentIds([bundle.id]);
          const products = children
            .map((child) => child.platform_identifier)
            .filter((identifier): identifier is PlatformIdentifier =>
              Boolean(identifier)
            );
          return {
            email: bundle.requester_email,
            firstname: bundle.requester_first_name,
            lastname: bundle.requester_last_name,
            company: bundle.organization_name,
            message: `${products.join(', ')}: Message sent for free trial: ${bundle.hub_status.toLowerCase()} ${bundle.type}.\n\n${message}`,
          };
        }
      } else {
        deploymentRequest =
          await DeploymentRequestDomain.loadLatestDeploymentRequestForUser(
            user.id,
            {
              type: DeploymentRequestDeploymentType.Trial,
              platform_identifier: platformIdentifier,
            }
          );
      }

      if (!deploymentRequest) {
        return {
          email: user.email,
          firstname: user.first_name,
          lastname: user.last_name,
          company:
            user.organizations.find(
              (org) => org.id === user.selected_organization_id
            )?.name || '',
          message: `${platformIdentifier}: ${message}`,
        };
      }
    } else {
      throw new Error(
        'Either userId, platformToken or platformId must be provided'
      );
    }

    return {
      email: deploymentRequest.requester_email,
      firstname: deploymentRequest.requester_first_name,
      lastname: deploymentRequest.requester_last_name,
      company: deploymentRequest.organization_name,
      message: `${deploymentRequest.platform_identifier}: Message sent for free trial: ${deploymentRequest.hub_status.toLowerCase()} ${deploymentRequest.type}.\n\n${message}`,
    };
  });
