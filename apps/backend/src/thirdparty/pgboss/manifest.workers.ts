import type { PgBoss } from 'pg-boss';
import { requestContext } from '../../context/request.context';
import { ManifestApp } from '../../modules/shareable-resource/manifest/manifest.app';
import { SYSTEM_USER_CONTEXT } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { MANIFEST_QUEUES, type ManifestRebuildJobData } from './manifest.jobs';
import { RETRY_STRATEGIES } from './retry-strategies';
import { createBatchHandler } from './workers';

const handleManifestRebuildJob = createBatchHandler<ManifestRebuildJobData>(
  async (job) => {
    await requestContext.run(SYSTEM_USER_CONTEXT, async () => {
      await ManifestApp.processManifestQueue(job.data);
    });
  }
);

export const ManifestWorkers = {
  start: async (boss: PgBoss): Promise<void> => {
    await boss.createQueue(MANIFEST_QUEUES.DEAD_LETTER, {
      ...RETRY_STRATEGIES.dlq,
    });

    await boss.createQueue(MANIFEST_QUEUES.REBUILD, {
      ...RETRY_STRATEGIES.standard,
      policy: 'stately',
      deadLetter: MANIFEST_QUEUES.DEAD_LETTER,
    });

    await boss.createQueue(MANIFEST_QUEUES.IMMEDIATE, {
      ...RETRY_STRATEGIES.standard,
      policy: 'stately',
      deadLetter: MANIFEST_QUEUES.DEAD_LETTER,
    });

    await boss.work<ManifestRebuildJobData>(
      MANIFEST_QUEUES.REBUILD,
      { batchSize: 1 },
      handleManifestRebuildJob
    );

    await boss.work<ManifestRebuildJobData>(
      MANIFEST_QUEUES.IMMEDIATE,
      { batchSize: 1 },
      handleManifestRebuildJob
    );

    logApp.info('[PgBoss] Manifest workers started');

    try {
      await ManifestApp.resumePendingRebuilds();
    } catch (error) {
      logApp.error('[PgBoss] Unable to resume pending manifest rebuilds', {
        error,
      });
    }
  },
};
