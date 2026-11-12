import type { PgBoss } from 'pg-boss';
import { logApp } from '../../utils/app-logger.util';
import { teamsNotificationSend } from '../teams-notification/teams-notification';
import { RETRY_STRATEGIES } from './retry-strategies';
import {
  TEAMS_NOTIFICATION_QUEUES,
  type TeamsNotificationJobData,
} from './teams-notification.jobs';
import { createBatchHandler } from './workers';

const handleTeamsNotificationJob = createBatchHandler<TeamsNotificationJobData>(
  async (job) => teamsNotificationSend(job.data.event, job.data.payload)
);

export const TeamsNotificationWorkers = {
  start: async (boss: PgBoss): Promise<void> => {
    await boss.createQueue(TEAMS_NOTIFICATION_QUEUES.DEAD_LETTER, {
      ...RETRY_STRATEGIES.dlq,
    });

    await boss.createQueue(TEAMS_NOTIFICATION_QUEUES.SEND, {
      ...RETRY_STRATEGIES.standard,
      deadLetter: TEAMS_NOTIFICATION_QUEUES.DEAD_LETTER,
    });

    await boss.work<TeamsNotificationJobData>(
      TEAMS_NOTIFICATION_QUEUES.SEND,
      { batchSize: 1 },
      handleTeamsNotificationJob
    );

    logApp.info('[PgBoss] Teams notification workers started');
  },
};
