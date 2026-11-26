import type { PgBoss } from 'pg-boss';
import { SYSTEM_USER_CONTEXT } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { hubspotWebhookSend } from '../hubspot/hubspot';
import {
  HUBSPOT_QUEUES,
  HUBSPOT_TYPE_TO_QUEUE,
  type HubspotJobData,
} from './hubspot.jobs';
import { RETRY_STRATEGIES } from './retry-strategies';
import { createBatchHandler } from './workers';

const handleHubspotJob = createBatchHandler<HubspotJobData>(
  SYSTEM_USER_CONTEXT,
  async (job) => hubspotWebhookSend(job.data.type, job.data.payload)
);

export const HubspotWorkers = {
  start: async (boss: PgBoss): Promise<void> => {
    await boss.createQueue(HUBSPOT_QUEUES.DEAD_LETTER, {
      ...RETRY_STRATEGIES.dlq,
    });

    for (const queueName of Object.values(HUBSPOT_TYPE_TO_QUEUE)) {
      await boss.createQueue(queueName, {
        ...RETRY_STRATEGIES.standard,
        deadLetter: HUBSPOT_QUEUES.DEAD_LETTER,
      });

      await boss.work<HubspotJobData>(
        queueName,
        { batchSize: 1 },
        handleHubspotJob
      );
    }

    logApp.info('[PgBoss] HubSpot workers started');
  },
};
