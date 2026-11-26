import type { PgBoss } from 'pg-boss';
import { TelemetryApp } from '../../modules/telemetry/telemetry.app';
import { SYSTEM_USER_CONTEXT } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { RETRY_STRATEGIES } from './retry-strategies';
import { TELEMETRY_QUEUES, type TelemetryJobData } from './telemetry.jobs';
import { createBatchHandler } from './workers';

const handleTelemetryJob = createBatchHandler<TelemetryJobData>(
  SYSTEM_USER_CONTEXT,
  async (job) => TelemetryApp.indexTelemetryEvent(job.data.event)
);

export const TelemetryWorkers = {
  start: async (boss: PgBoss): Promise<void> => {
    await boss.createQueue(TELEMETRY_QUEUES.DEAD_LETTER, {
      ...RETRY_STRATEGIES.dlq,
    });

    await boss.createQueue(TELEMETRY_QUEUES.EVENTS, {
      ...RETRY_STRATEGIES.standard,
      deadLetter: TELEMETRY_QUEUES.DEAD_LETTER,
    });

    await boss.work<TelemetryJobData>(
      TELEMETRY_QUEUES.EVENTS,
      { batchSize: 1 },
      handleTelemetryJob
    );

    logApp.info('[PgBoss] Telemetry workers started');
  },
};
