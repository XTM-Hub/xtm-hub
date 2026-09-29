import config from 'config';
import { OneClickDeployInput } from '../../__generated__/resolvers-types';
import portalConfig from '../../config';
import { requestContext } from '../../context/request.context';
import OneClickDeployment, {
  OneClickDeploymentInitializer,
} from '../../model/kanel/public/OneClickDeployment';
import { UserId } from '../../model/kanel/public/User';
import { esDbClient } from '../../thirdparty/elasticsearch/client';
import { PgBossProducer } from '../../thirdparty/pgboss/producer';
import { TELEMETRY_QUEUES } from '../../thirdparty/pgboss/telemetry.jobs';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode } from '../../utils/error/error.code';
import { extractId } from '../../utils/utils';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { OneClickDeploymentDomain } from './one-click-deployment.domain';
import { loadInstanceIdentity } from './telemetry-snapshot.domain';
import { TelemetryHelper } from './telemetry.helper';
import {
  OneClickDeployEvent,
  TelemetryEvent,
  TelemetryEventType,
} from './telemetry.types';

const TELEMETRY_INDEX = 'telemetry';

const toOneClickDeploymentInitializer = (
  event: OneClickDeployEvent
): OneClickDeploymentInitializer => ({
  resource_id: event.resource_id,
  platform_id: event.platform_id,
  tenant_id: event.tenant_id ?? null,
  user_id: event.user_id ?? null,
  deployed_at: new Date(event['@timestamp']),
});

const useQueueProcessing = (): boolean =>
  config.get<boolean>('telemetry_use_queue_processing');

const getQueuedEventTypes = (): string[] =>
  config.get<string[]>('telemetry_queued_event_types');

// The durable instance identity is loaded once and cached for the process
// lifetime (it is seeded by the add_platform_metadata migration and never
// changes). A failed load resolves to 'unknown' for the in-flight events and
// only retries after a backoff window, so a persistent database outage does
// not trigger one identity query + one error log per emitted event.
const UNKNOWN_HUB_INSTANCE_ID = 'unknown';
const FAILED_IDENTITY_LOAD_BACKOFF_MS = 60_000;

let hubInstanceIdPromise: Promise<string> | undefined;
let lastFailedIdentityLoadAtMs: number | undefined;

const getHubInstanceId = (): Promise<string> => {
  if (hubInstanceIdPromise === undefined) {
    if (
      lastFailedIdentityLoadAtMs !== undefined &&
      Date.now() - lastFailedIdentityLoadAtMs < FAILED_IDENTITY_LOAD_BACKOFF_MS
    ) {
      return Promise.resolve(UNKNOWN_HUB_INSTANCE_ID);
    }
    hubInstanceIdPromise = loadInstanceIdentity().then(
      ({ instanceId }) => {
        lastFailedIdentityLoadAtMs = undefined;
        return instanceId;
      },
      (error) => {
        hubInstanceIdPromise = undefined;
        lastFailedIdentityLoadAtMs = Date.now();
        logApp.error('Failed to load hub instance identity for telemetry', {
          error,
        });
        return UNKNOWN_HUB_INSTANCE_ID;
      }
    );
  }
  return hubInstanceIdPromise;
};

/** Test-only: reset the memoized hub identity between test cases. */
export const resetHubIdentityCacheForTests = (): void => {
  hubInstanceIdPromise = undefined;
  lastFailedIdentityLoadAtMs = undefined;
};

/**
 * Stamp the emitting hub instance on the event before it leaves the process
 * (both the pg-boss and the synchronous ES paths go through this). Without
 * it the warehouse cannot tell production events apart from staging/dev
 * hubs replicating into the same pipeline.
 */
const withHubIdentity = async (
  event: TelemetryEvent
): Promise<TelemetryEvent> => ({
  ...event,
  hub_instance_id: await getHubInstanceId(),
  hub_environment: portalConfig.environment,
});

export const TelemetryApp = {
  async indexTelemetryEvent(event: TelemetryEvent) {
    await esDbClient.index({
      index: TELEMETRY_INDEX,
      document: event,
    });
  },

  async sendTelemetryEvent(rawEvent: TelemetryEvent) {
    try {
      const event = await withHubIdentity(rawEvent);
      if (useQueueProcessing()) {
        const queuedTypes = getQueuedEventTypes();
        if (
          queuedTypes.length === 0 ||
          queuedTypes.includes(event.event_type)
        ) {
          try {
            await PgBossProducer.send(TELEMETRY_QUEUES.EVENTS, { event });
          } catch (error) {
            logApp.error('Failed to enqueue telemetry event', { event, error });
          }
          return;
        }
      }
      TelemetryApp.indexTelemetryEvent(event).catch((error) => {
        logApp.error('Error sending telemetry event synchronously', {
          event,
          error,
        });
      });
    } catch (error) {
      logApp.error('Error sending telemetry event ', {
        event: rawEvent,
        error,
      });
    }
  },

  async getLastDeployments(
    platformId: string,
    tenantId: string | null,
    limit: number
  ): Promise<OneClickDeployment[]> {
    return OneClickDeploymentDomain.loadOneClickDeployments({
      filter: { platform_id: platformId, tenant_id: tenantId },
      limit,
    });
  },

  async countEventsByDocumentId(
    eventType: TelemetryEventType,
    documentId: string
  ) {
    return await esDbClient.count({
      index: TELEMETRY_INDEX,
      query: {
        bool: {
          filter: [
            { term: { event_type: eventType } },
            { term: { resource_id: documentId } },
          ],
        },
      },
    });
  },

  async sendOneClickDeployEvent({
    userId,
    input,
  }: {
    userId: UserId;
    input: OneClickDeployInput;
  }) {
    const user = requestContext.requireUser();
    const selected_organization_id = user.selected_organization_id;

    const selectedOrga = await OrganizationDomain.loadOrganizationBy({
      id: selected_organization_id,
    });
    if (!selectedOrga) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }

    const serviceDefinition =
      await ServiceInstanceDomain.loadServiceDefinitionByServiceInstance(
        input.service_instance_id
      );

    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceNotFound);
    }
    const platformServiceInstanceId = extractId<'RegisteredPlatform'>(
      input.platform_service_instance_id
    );
    const platformConfiguration =
      await ServiceInstanceDomain.loadPlatformConfigurationByServiceInstanceId(
        platformServiceInstanceId
      );
    if (!platformConfiguration) {
      throw new Error(ErrorCode.PlatformConfigurationNotFound);
    }

    const event = await TelemetryHelper.buildOneClickDeployEvent(
      selectedOrga,
      userId,
      serviceDefinition.identifier,
      input.platform_identifier,
      platformConfiguration?.platform_id,
      platformConfiguration?.platform_version ?? undefined,
      input.resource_id,
      input.resource_title,
      platformConfiguration?.tenant_id ?? undefined
    );
    await TelemetryApp.sendTelemetryEvent(event);

    try {
      await OneClickDeploymentDomain.insert(
        toOneClickDeploymentInitializer(event)
      );
    } catch (error) {
      logApp.error('Failed to persist one-click deployment to Postgres', {
        resource_id: event.resource_id,
        error,
      });
    }
  },
};
