import config from 'config';
import portalConfig from '../../config';
import { logApp } from '../../utils/app-logger.util';
import { isValidUrl } from '../../utils/utils';
import type {
  TeamsNotificationEvent,
  TeamsNotificationPayloadMap,
} from '../pgboss/teams-notification.jobs';

const WEBHOOK_TIMEOUT_MS = 10_000;
const ERROR_BODY_MAX_LENGTH = 500;

// Throws on failure so PgBoss can retry.
export async function teamsNotificationSend<T extends TeamsNotificationEvent>(
  event: T,
  payload: TeamsNotificationPayloadMap[T]
) {
  const webhookUrl = config.get<string>('teams_notification_webhook_url');
  if (!isValidUrl(webhookUrl)) {
    // Empty is the kill switch; anything else is a misconfiguration that would silently drop every notification.
    if (webhookUrl) {
      logApp.warn(
        `Teams notification ${event} skipped: teams_notification_webhook_url is set but not a valid URL`
      );
    } else {
      logApp.debug(`Teams notification ${event} skipped: empty webhook URL`);
    }
    return;
  }

  const token = config.get<string>('teams_notification_webhook_token');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event,
        environment: portalConfig.environment,
        ...payload,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.text().catch(() => '')).slice(
        0,
        ERROR_BODY_MAX_LENGTH
      );
      throw new Error(
        `Teams notification webhook returned HTTP ${response.status}: ${body}`
      );
    }

    await response.body?.cancel();

    logApp.info(`Teams notification ${event} sent`);
  } finally {
    clearTimeout(timeoutId);
  }
}
