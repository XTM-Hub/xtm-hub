import type { PgBoss } from 'pg-boss';
import { RegistrationApp } from '../../modules/registration/registration.app';
import { SYSTEM_USER_CONTEXT } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import {
  REGISTRATION_QUEUES,
  type CommercialModelJobData,
} from './registration.jobs';
import { RETRY_STRATEGIES } from './retry-strategies';
import { createBatchHandler } from './workers';

const handleCommercialModelJob = createBatchHandler<CommercialModelJobData>(
  SYSTEM_USER_CONTEXT,
  async (job) => RegistrationApp.refreshCommercialModel(job.data)
);

export const RegistrationWorkers = {
  start: async (boss: PgBoss): Promise<void> => {
    await boss.createQueue(REGISTRATION_QUEUES.DEAD_LETTER, {
      ...RETRY_STRATEGIES.dlq,
    });

    await boss.createQueue(REGISTRATION_QUEUES.COMMERCIAL_MODEL, {
      ...RETRY_STRATEGIES.standard,
      deadLetter: REGISTRATION_QUEUES.DEAD_LETTER,
    });

    await boss.work<CommercialModelJobData>(
      REGISTRATION_QUEUES.COMMERCIAL_MODEL,
      { batchSize: 1 },
      handleCommercialModelJob
    );

    logApp.info('[PgBoss] Registration workers started');
  },
};
