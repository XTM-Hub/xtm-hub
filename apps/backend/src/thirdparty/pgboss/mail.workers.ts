import type { PgBoss } from 'pg-boss';
import { SYSTEM_USER_CONTEXT } from '../../portal.const';
import { sendMailDirect } from '../../server/mail-service';
import { logApp } from '../../utils/app-logger.util';
import { MAIL_QUEUES, type MailJobData } from './mail.jobs';
import { RETRY_STRATEGIES } from './retry-strategies';
import { createBatchHandler } from './workers';

const handleMailJob = createBatchHandler<MailJobData>(
  SYSTEM_USER_CONTEXT,
  async (job) => sendMailDirect(job.data)
);

export const MailWorkers = {
  start: async (boss: PgBoss): Promise<void> => {
    await boss.createQueue(MAIL_QUEUES.DEAD_LETTER, {
      ...RETRY_STRATEGIES.dlq,
    });

    await boss.createQueue(MAIL_QUEUES.SEND, {
      ...RETRY_STRATEGIES.standard,
      deadLetter: MAIL_QUEUES.DEAD_LETTER,
    });

    await boss.work<MailJobData>(
      MAIL_QUEUES.SEND,
      { batchSize: 1 },
      handleMailJob
    );

    logApp.info('[PgBoss] Mail workers started');
  },
};
