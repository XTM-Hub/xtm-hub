import type { Job, PgBoss } from 'pg-boss';
import { logApp } from '../../utils/app-logger.util';
import { DeadLetterWorkers } from './deadletter.workers';
import { HubspotWorkers } from './hubspot.workers';
import { MailWorkers } from './mail.workers';
import { ManifestWorkers } from './manifest.workers';
import { PgBossMetrics } from './pgboss.metrics';
import { RegistrationWorkers } from './registration.workers';
import { TelemetryWorkers } from './telemetry.workers';

export function createBatchHandler<T extends object>(
  processJob: (job: Job<T>) => Promise<void>
): (jobs: Job<T>[]) => Promise<void> {
  return async (jobs: Job<T>[]) => {
    for (const job of jobs) {
      logApp.info(`[PgBoss] Processing ${job.name} job`, { jobId: job.id });
      const end = PgBossMetrics.counters.jobDuration.startTimer({
        queue: job.name,
      });
      try {
        await processJob(job);
        PgBossMetrics.counters.jobsProcessed.inc({
          queue: job.name,
          result: 'success',
        });
      } catch (err) {
        logApp.warn(`[PgBoss] Job "${job.name}" failed`, {
          jobId: job.id,
          data: job.data,
          error: err,
        });

        PgBossMetrics.counters.jobsProcessed.inc({
          queue: job.name,
          result: 'error',
        });
        throw err;
      } finally {
        end();
      }
    }
  };
}

export const PgBossWorkers = {
  startAll: async (boss: PgBoss): Promise<void> => {
    await HubspotWorkers.start(boss);
    await TelemetryWorkers.start(boss);
    await MailWorkers.start(boss);
    await ManifestWorkers.start(boss);
    await RegistrationWorkers.start(boss);
    await DeadLetterWorkers.start(boss);
    logApp.info('[PgBoss] All workers started');
  },
};
