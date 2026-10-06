import cron from 'node-cron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cronMocks = vi.hoisted(() => ({
  scheduledCallbacks: [] as Array<() => Promise<void> | void>,
  scheduledTaskStops: [] as Array<ReturnType<typeof vi.fn>>,
  requestContextRunMock: vi.fn(
    async (_context: unknown, callback: () => Promise<void> | void) =>
      callback()
  ),
  expireTrialsMock: vi.fn(async () => undefined),
  sendPendingUsersDigestMock: vi.fn(async () => undefined),
  sendPublicRoadmapMonthlyReminderMock: vi.fn(async () => undefined),
  removeExpiredGroupsMock: vi.fn(async () => undefined),
  cleanExpiredNewsFeedItemsMock: vi.fn(async () => undefined),
  syncUserAccountStatusWithAuth0Mock: vi.fn(async () => undefined),
  auth0Sync: { enabled: true },
}));

vi.mock('./config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./config')>();
  return {
    default: { ...actual.default, auth0_sync: cronMocks.auth0Sync },
  };
});

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(
      (_expression: string, callback: () => Promise<void> | void) => {
        cronMocks.scheduledCallbacks.push(callback);
        const stop = vi.fn();
        cronMocks.scheduledTaskStops.push(stop);
        return { stop };
      }
    ),
  },
}));

vi.mock('./context/request.context', () => ({
  requestContext: {
    run: cronMocks.requestContextRunMock,
  },
}));

vi.mock('./modules/deployment/deployment.app', () => ({
  DeploymentApp: {
    expireTrials: cronMocks.expireTrialsMock,
  },
}));

vi.mock(
  './modules/organization-management/user/user-organization/user-organization.app',
  () => ({
    UserOrganizationApp: {
      sendPendingUsersDigest: cronMocks.sendPendingUsersDigestMock,
    },
  })
);

vi.mock('./modules/xtm-platform-roadmap/epic.app', () => ({
  EpicApp: {
    sendPublicRoadmapMonthlyReminder:
      cronMocks.sendPublicRoadmapMonthlyReminderMock,
  },
}));

vi.mock('./modules/deployment/group/service-group.app', () => ({
  ServiceGroupApp: {
    removeExpiredGroups: cronMocks.removeExpiredGroupsMock,
  },
}));

vi.mock('./utils/app-logger.util', () => ({
  logApp: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./modules/news-feed/news-feed.app', () => ({
  NewsFeedApp: {
    cleanExpiredNewsFeedItems: cronMocks.cleanExpiredNewsFeedItemsMock,
  },
}));

vi.mock(
  './modules/organization-management/user/user-account-status-sync/user-account-status-sync.app',
  () => ({
    UserAccountStatusSyncApp: {
      syncUserAccountStatusWithAuth0:
        cronMocks.syncUserAccountStatusWithAuth0Mock,
    },
  })
);

import { initCronJobs, stopCronJobs } from './crons';
import { CRONS_USER_CONTEXT } from './portal.const';

describe('crons', () => {
  beforeEach(() => {
    cronMocks.scheduledCallbacks.length = 0;
    cronMocks.scheduledTaskStops.length = 0;
    cronMocks.auth0Sync.enabled = true;
    vi.clearAllMocks();
    stopCronJobs();
  });

  it('should set CRONS_USER_CONTEXT for every cron task execution', async () => {
    initCronJobs();

    expect(cronMocks.scheduledCallbacks).toHaveLength(6);

    for (const callback of cronMocks.scheduledCallbacks) {
      await callback();
    }

    expect(cronMocks.requestContextRunMock).toHaveBeenCalledTimes(6);
    expect(cronMocks.requestContextRunMock).toHaveBeenNthCalledWith(
      1,
      CRONS_USER_CONTEXT,
      expect.any(Function)
    );
    expect(cronMocks.requestContextRunMock).toHaveBeenNthCalledWith(
      2,
      CRONS_USER_CONTEXT,
      expect.any(Function)
    );
    expect(cronMocks.requestContextRunMock).toHaveBeenNthCalledWith(
      3,
      CRONS_USER_CONTEXT,
      expect.any(Function)
    );
    expect(cronMocks.requestContextRunMock).toHaveBeenNthCalledWith(
      4,
      CRONS_USER_CONTEXT,
      expect.any(Function)
    );
    expect(cronMocks.requestContextRunMock).toHaveBeenNthCalledWith(
      5,
      CRONS_USER_CONTEXT,
      expect.any(Function)
    );
    expect(cronMocks.requestContextRunMock).toHaveBeenNthCalledWith(
      6,
      CRONS_USER_CONTEXT,
      expect.any(Function)
    );

    expect(cronMocks.expireTrialsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.sendPendingUsersDigestMock).toHaveBeenCalledTimes(1);
    expect(
      cronMocks.sendPublicRoadmapMonthlyReminderMock
    ).toHaveBeenCalledTimes(1);
    expect(cronMocks.removeExpiredGroupsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.cleanExpiredNewsFeedItemsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.syncUserAccountStatusWithAuth0Mock).toHaveBeenCalledTimes(
      1
    );
  });

  it('should schedule the Auth0 sync hourly without overlap', () => {
    initCronJobs();

    expect(cron.schedule).toHaveBeenCalledWith(
      '0 * * * *',
      expect.any(Function),
      { noOverlap: true }
    );
  });

  it('should not schedule the Auth0 sync when it is disabled', () => {
    cronMocks.auth0Sync.enabled = false;

    initCronJobs();

    expect(cronMocks.scheduledCallbacks).toHaveLength(5);
    expect(cron.schedule).not.toHaveBeenCalledWith(
      '0 * * * *',
      expect.any(Function),
      expect.anything()
    );
  });

  it('should stop all scheduled tasks', () => {
    initCronJobs();

    stopCronJobs();

    expect(cronMocks.scheduledTaskStops).toHaveLength(6);
    for (const stop of cronMocks.scheduledTaskStops) {
      expect(stop).toHaveBeenCalledTimes(1);
    }
  });
});
