import config from 'config';
import { OrganizationCapability } from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import type User from '../../model/kanel/public/User';
import type { UserId } from '../../model/kanel/public/User';
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

/**
 * Hands a built payload to HubSpot. Delivery is best effort: a failure is logged, never returned to the caller.
 */
const deliverHubspotPayload = async <T extends HubspotWebhookType>(
  type: T,
  payload: HubspotPayloadMap[T]
) => {
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
};

export async function hubspotHook<T extends HubspotWebhookType>(
  type: T,
  buildPayload: () => Promise<HubspotPayloadMap[T]>
) {
  try {
    const payload = await buildPayload();
    await deliverHubspotPayload(type, payload);
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

export const hubspotInviteUserHook = async (
  user: Pick<User, 'email' | 'first_name' | 'last_name'>
) =>
  hubspotHook('inviteUser', async () => ({
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    inviter_email: requestContext.requireUser().email,
  }));

export type ReachOutSalesPayload = HubspotPayloadMap['reachOutSales'];

/**
 * Sends a contact request already resolved by the caller. Delivery is best effort, like every other hook.
 */
export const hubspotReachOutSalesHook = async (contact: ReachOutSalesPayload) =>
  deliverHubspotPayload('reachOutSales', contact);
