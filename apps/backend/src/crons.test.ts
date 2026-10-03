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
  cleanExpiredPulseSaltsMock: vi.fn(async () => 0),
  applyPulseRetentionMock: vi.fn(async () => undefined),
  cleanPulseRateLimitsMock: vi.fn(async () => 0),
}));

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

vi.mock('./modules/pulse/pulse.app', () => ({
  PulseApp: {
    cleanExpiredSalts: cronMocks.cleanExpiredPulseSaltsMock,
    applyRetention: cronMocks.applyPulseRetentionMock,
    cleanRateLimitBuckets: cronMocks.cleanPulseRateLimitsMock,
  },
}));

import { initCronJobs, stopCronJobs } from './crons';
import { CRONS_USER_CONTEXT } from './portal.const';

describe('crons', () => {
  beforeEach(() => {
    cronMocks.scheduledCallbacks.length = 0;
    cronMocks.scheduledTaskStops.length = 0;
    vi.clearAllMocks();
    stopCronJobs();
  });

  it('should set CRONS_USER_CONTEXT for every cron task execution', async () => {
    initCronJobs();

    expect(cronMocks.scheduledCallbacks).toHaveLength(8);

    for (const callback of cronMocks.scheduledCallbacks) {
      await callback();
    }

    expect(cronMocks.requestContextRunMock).toHaveBeenCalledTimes(8);
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

    expect(cronMocks.expireTrialsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.sendPendingUsersDigestMock).toHaveBeenCalledTimes(1);
    expect(
      cronMocks.sendPublicRoadmapMonthlyReminderMock
    ).toHaveBeenCalledTimes(1);
    expect(cronMocks.removeExpiredGroupsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.cleanExpiredNewsFeedItemsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.cleanExpiredPulseSaltsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.applyPulseRetentionMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.cleanPulseRateLimitsMock).toHaveBeenCalledTimes(1);
  });

  it('should stop all scheduled tasks', () => {
    initCronJobs();

    stopCronJobs();

    expect(cronMocks.scheduledTaskStops).toHaveLength(8);
    for (const stop of cronMocks.scheduledTaskStops) {
      expect(stop).toHaveBeenCalledTimes(1);
    }
  });
});
