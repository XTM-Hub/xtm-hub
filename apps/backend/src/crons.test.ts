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
  resumePendingRebuildsMock: vi.fn(async () => ({ resumed: 0, failed: 0 })),
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

vi.mock('./modules/shareable-resource/manifest/manifest.app', () => ({
  ManifestApp: {
    resumePendingRebuilds: cronMocks.resumePendingRebuildsMock,
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

    expect(cronMocks.expireTrialsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.sendPendingUsersDigestMock).toHaveBeenCalledTimes(1);
    expect(
      cronMocks.sendPublicRoadmapMonthlyReminderMock
    ).toHaveBeenCalledTimes(1);
    expect(cronMocks.removeExpiredGroupsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.cleanExpiredNewsFeedItemsMock).toHaveBeenCalledTimes(1);
    expect(cronMocks.resumePendingRebuildsMock).toHaveBeenCalledTimes(1);
  });

  it('should only resume manifest rebuilds pending for more than an hour', async () => {
    initCronJobs();
    const before = Date.now();

    await cronMocks.scheduledCallbacks[5]!();

    const [[{ createdBefore }]] = cronMocks.resumePendingRebuildsMock.mock
      .calls as unknown as [[{ createdBefore: Date }]];
    const delay = before - createdBefore.getTime();
    expect(delay).toBeGreaterThanOrEqual(60 * 60 * 1000 - 1000);
    expect(delay).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
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
