import cron, { ScheduledTask } from 'node-cron';
import portalConfig from './config';
import { requestContext } from './context/request.context';
import { DeploymentApp } from './modules/deployment/deployment.app';
import { ServiceGroupApp } from './modules/deployment/group/service-group.app';
import { NewsFeedApp } from './modules/news-feed/news-feed.app';
import { UserAccountStatusSyncApp } from './modules/organization-management/user/user-account-status-sync/user-account-status-sync.app';
import { UserOrganizationApp } from './modules/organization-management/user/user-organization/user-organization.app';
import { EpicApp } from './modules/xtm-platform-roadmap/epic.app';
import { CRONS_USER_CONTEXT } from './portal.const';
import { logApp } from './utils/app-logger.util';

const scheduledTasks: ScheduledTask[] = [];

const expireTrials = async (): Promise<void> => {
  logApp.info('Running expireTrials job');
  await requestContext.run(CRONS_USER_CONTEXT, async () => {
    try {
      await DeploymentApp.expireTrials();
    } catch (error) {
      logApp.error('ExpireTrials job failed:', { error });
    }
  });
};

const sendPendingUserDigest = async (): Promise<void> => {
  logApp.info('Running sendPendingUserDigest job');
  await requestContext.run(CRONS_USER_CONTEXT, async () => {
    try {
      await UserOrganizationApp.sendPendingUsersDigest();
    } catch (error) {
      logApp.error('SendPendingUserDigest job failed:', { error });
    }
  });
};

const sendPublicRoadmapMonthlyReminder = async (): Promise<void> => {
  logApp.info('Running sendPublicRoadmapMonthlyReminder job');
  await requestContext.run(CRONS_USER_CONTEXT, async () => {
    try {
      await EpicApp.sendPublicRoadmapMonthlyReminder();
    } catch (error) {
      logApp.error('sendPublicRoadmapMonthlyReminder job failed:', { error });
    }
  });
};

const cleanExpiredTrialGroups = async (): Promise<void> => {
  logApp.info('Running cleanExpiredTrialGroups job');
  await requestContext.run(CRONS_USER_CONTEXT, async () => {
    try {
      await ServiceGroupApp.removeExpiredGroups();
    } catch (error) {
      logApp.error('cleanExpiredTrialGroups job failed:', { error });
    }
  });
};

const cleanExpiredNewsFeedItems = async (): Promise<void> => {
  logApp.info('Running cleanExpiredNewsFeedItems job');
  await requestContext.run(CRONS_USER_CONTEXT, async () => {
    try {
      await NewsFeedApp.cleanExpiredNewsFeedItems();
    } catch (error) {
      logApp.error('cleanExpiredNewsFeedItems job failed:', { error });
    }
  });
};

const syncUserAccountStatus = async (): Promise<void> => {
  logApp.info('Running syncUserAccountStatus job');
  await requestContext.run(CRONS_USER_CONTEXT, async () => {
    try {
      await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0();
    } catch (error) {
      logApp.error('syncUserAccountStatus job failed:', { error });
    }
  });
};

export const initCronJobs = () => {
  logApp.info('Initializing cron jobs');
  scheduledTasks.push(cron.schedule('0 2 * * *', expireTrials));
  scheduledTasks.push(cron.schedule('0 9 * * 1', sendPendingUserDigest));
  scheduledTasks.push(
    cron.schedule('0 8 23-25 * *', sendPublicRoadmapMonthlyReminder, {
      timezone: 'Europe/Paris',
    })
  );
  scheduledTasks.push(cron.schedule('0 3 * * *', cleanExpiredTrialGroups));
  scheduledTasks.push(cron.schedule('0 4 * * *', cleanExpiredNewsFeedItems));
  if (portalConfig.auth0_sync.enabled) {
    // Environments restored from production share the Auth0 tenant and keep
    // real accounts, so the sync is enabled explicitly per environment.
    // noOverlap: a run still in progress makes the next tick skip (per process).
    scheduledTasks.push(
      cron.schedule('*/10 * * * *', syncUserAccountStatus, { noOverlap: true })
    );
  } else {
    logApp.info('Auth0 sync cron not scheduled: disabled for this environment');
  }
};

export const stopCronJobs = () => {
  logApp.info('Stopping cron jobs');
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;
  logApp.info('Cron jobs stopped');
};
