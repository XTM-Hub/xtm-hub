import type { Management } from 'auth0';
import {
  FeatureFlag,
  UserAccountStatus,
} from '../../../../__generated__/resolvers-types';
import portalConfig from '../../../../config';
import User from '../../../../model/kanel/public/User';
import {
  EMAILS_PER_LOOKUP,
  isRateLimitError,
} from '../../../../thirdparty/auth0/auth0.util';
import { auth0Client } from '../../../../thirdparty/auth0/client';
import { logApp } from '../../../../utils/app-logger.util';
import { getErrorMessage } from '../../../../utils/error/error-guard.util';
import { ErrorCode } from '../../../../utils/error/error.code';
import { isFeatureEnabled } from '../../../../utils/feature-flag.util';
import { mapWithConcurrency } from '../../../../utils/typescript';
import { chunk } from '../../../../utils/utils';
import { ServiceGroupApp } from '../../../deployment/group/service-group.app';
import {
  UserDomain,
  UserToSyncAccountStatus,
} from '../user-domain/user.domain';

export interface Auth0SyncOptions {
  maxUsersPerRun: number;
  concurrency: number;
  deadlineMinutes: number;
}

type Auth0Accounts = Management.UserResponseSchema[];

interface RunCounters {
  invited: number;
  activated: number;
  expired: number;
  unchanged: number;
  failed: number;
  skipped: number;
}

// State shared by the steps of one run. A rate limit only blocks the actions
// calling Auth0; the deadline blocks everything.
interface RunContext {
  options: Auth0SyncOptions;
  deadline: number;
  counters: RunCounters;
  rateLimited: boolean;
  deadlineReached: boolean;
  notGrantedUserIds: string[];
}

interface GrantTask {
  user: User;
  accounts: Auth0Accounts;
  newStatus: UserAccountStatus | null;
  syncAuth0: boolean;
}

const STALE_AFTER_DAYS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_LOGGED_USER_IDS = 20;

const loadOptions = (): Auth0SyncOptions => ({
  maxUsersPerRun: portalConfig.auth0_sync.max_users_per_run,
  concurrency: portalConfig.auth0_sync.concurrency,
  deadlineMinutes: portalConfig.auth0_sync.deadline_minutes,
});

type SyncTarget = {
  syncAuth0: boolean;
  newStatus: UserAccountStatus | null | undefined;
};

// Multiple Auth0 accounts for one email should not happen: any reset counts.
export const decideAuth0Sync = (
  status: UserAccountStatus,
  accounts: Auth0Accounts
): SyncTarget => {
  const isWaiting = status === UserAccountStatus.Waiting;
  if (accounts.length === 0) {
    return {
      syncAuth0: false,
      newStatus: isWaiting ? undefined : UserAccountStatus.Expired,
    };
  }

  const hasResetPassword = accounts.some(
    (account) => !!account.last_password_reset
  );
  // Invited: access was already granted when it became invited.
  if (hasResetPassword) {
    return { syncAuth0: isWaiting, newStatus: null };
  }
  return {
    syncAuth0: isWaiting,
    newStatus: isWaiting ? UserAccountStatus.Invited : undefined,
  };
};

const countStatusChange = (
  counters: RunCounters,
  newStatus: UserAccountStatus | null | undefined
) => {
  if (newStatus === null) {
    counters.activated += 1;
  } else if (newStatus === UserAccountStatus.Invited) {
    counters.invited += 1;
  } else if (newStatus === UserAccountStatus.Expired) {
    counters.expired += 1;
  } else {
    counters.unchanged += 1;
  }
};

const isDeadlineReached = (context: RunContext): boolean => {
  if (!context.deadlineReached && Date.now() >= context.deadline) {
    context.deadlineReached = true;
    logApp.warn(
      `Auth0 sync stopped: deadline of ${context.options.deadlineMinutes} minutes reached`
    );
  }
  return context.deadlineReached;
};

const logStatusChangedConcurrently = (context: RunContext, userId: string) => {
  logApp.info('Auth0 sync: user status changed concurrently, skipped', {
    userId,
  });
  context.counters.skipped += 1;
};

const handleStepError = (
  context: RunContext,
  error: unknown,
  affectedCount: number,
  failureMessage: string,
  failureFields: Record<string, unknown>
) => {
  if (getErrorMessage(error) === ErrorCode.UserStatusChangedConcurrently) {
    logStatusChangedConcurrently(context, String(failureFields.userId));
    return;
  }
  if (isRateLimitError(error)) {
    if (!context.rateLimited) {
      context.rateLimited = true;
      logApp.warn(
        'Auth0 sync stopped: Auth0 rate limit persists, remaining users left for next run'
      );
    }
    context.counters.skipped += affectedCount;
    return;
  }
  logApp.error(failureMessage, { ...failureFields, error });
  context.counters.failed += affectedCount;
};

const logStatusChange = (
  user: User,
  fromStatus: User['status'],
  toStatus: UserAccountStatus | null
) => {
  logApp.info(
    `Auth0 sync: user status changed from ${fromStatus} to ${toStatus}`,
    { userId: user.id, fromStatus, toStatus }
  );
};

const applyStatus = async (
  context: RunContext,
  user: User,
  status: UserAccountStatus | null
): Promise<boolean> => {
  const fromStatus = user.status;
  const updated = await UserDomain.updateUser(
    user.id,
    { status },
    { status: fromStatus }
  );
  if (!updated) {
    logStatusChangedConcurrently(context, user.id);
    return false;
  }
  user.status = status;
  logStatusChange(user, fromStatus, status);
  return true;
};

const fetchAccounts = async (
  context: RunContext,
  users: UserToSyncAccountStatus[]
): Promise<{
  accountsByEmail: Map<string, Auth0Accounts>;
  fetchedUsers: UserToSyncAccountStatus[];
}> => {
  const accountsByEmail = new Map<string, Auth0Accounts>();
  const fetchedUsers: UserToSyncAccountStatus[] = [];
  const chunks = chunk(users, EMAILS_PER_LOOKUP);
  for (const [index, usersChunk] of chunks.entries()) {
    if (isDeadlineReached(context) || context.rateLimited) {
      context.counters.skipped += usersChunk.length;
      continue;
    }
    try {
      const found = await auth0Client.getUsersByEmails(
        usersChunk.map(({ email }) => email)
      );
      found.forEach((accounts, email) => accountsByEmail.set(email, accounts));
      fetchedUsers.push(...usersChunk);
      const accountCount = [...found.values()].reduce(
        (total, accounts) => total + accounts.length,
        0
      );
      logApp.info(
        `Auth0 sync: fetched ${accountCount} accounts for ${usersChunk.length} users (chunk ${index + 1}/${chunks.length})`
      );
    } catch (error) {
      handleStepError(
        context,
        error,
        usersChunk.length,
        'Auth0 sync: unable to fetch accounts for a chunk',
        { userIds: usersChunk.map(({ id }) => id) }
      );
    }
  }
  return { accountsByEmail, fetchedUsers };
};

const decideAll = async (
  context: RunContext,
  fetchedUsers: UserToSyncAccountStatus[],
  accountsByEmail: Map<string, Auth0Accounts>
): Promise<GrantTask[]> => {
  const grantTasks: GrantTask[] = [];
  for (const user of fetchedUsers) {
    if (isDeadlineReached(context)) {
      context.counters.skipped += 1;
      continue;
    }
    const { status } = user;
    const accounts = accountsByEmail.get(user.email.toLowerCase()) ?? [];
    try {
      const { syncAuth0, newStatus } = decideAuth0Sync(status, accounts);
      if (newStatus !== undefined && newStatus !== UserAccountStatus.Expired) {
        grantTasks.push({ user, accounts, newStatus, syncAuth0 });
        continue;
      }
      if (
        newStatus !== undefined &&
        !(await applyStatus(context, user, newStatus))
      ) {
        continue;
      }
      countStatusChange(context.counters, newStatus);
    } catch (error) {
      handleStepError(context, error, 1, 'Auth0 sync: user processing failed', {
        userId: user.id,
      });
    }
  }
  return grantTasks;
};

const grantAll = async (context: RunContext, grantTasks: GrantTask[]) => {
  await mapWithConcurrency(
    grantTasks,
    context.options.concurrency,
    async ({ user, accounts, newStatus, syncAuth0 }) => {
      if (isDeadlineReached(context) || (context.rateLimited && syncAuth0)) {
        context.counters.skipped += 1;
        return;
      }
      try {
        const fromStatus = user.status;
        await ServiceGroupApp.grantUserAccessAndSetStatus(
          user,
          newStatus,
          fromStatus,
          { syncAuth0, prefetchedAuth0Users: accounts }
        );
        user.status = newStatus;
        logApp.info('Auth0 sync: access granted', { userId: user.id });
        logStatusChange(user, fromStatus, newStatus);
        countStatusChange(context.counters, newStatus);
      } catch (error) {
        if (
          isRateLimitError(error) ||
          getErrorMessage(error) === ErrorCode.UserStatusChangedConcurrently
        ) {
          handleStepError(
            context,
            error,
            1,
            'Auth0 sync: user processing failed',
            { userId: user.id }
          );
          return;
        }
        logApp.warn('Auth0 sync: unable to grant access', {
          userId: user.id,
          error,
        });
        context.notGrantedUserIds.push(user.id);
        context.counters.failed += 1;
      }
    }
  );
};

const buildSummary = (startedAt: number, counters: RunCounters): string =>
  `Auth0 sync done in ${Date.now() - startedAt}ms: ${counters.invited} invited, ${counters.activated} activated, ${counters.expired} expired, ${counters.unchanged} unchanged, ${counters.failed} failed, ${counters.skipped} left for next run`;

// One line per run: per-user errors would repeat every hour.
const logStaleUsers = (users: User[]) => {
  const staleUsers = users.filter(
    ({ invitation_date, status }) =>
      !!invitation_date &&
      (status === UserAccountStatus.Waiting ||
        status === UserAccountStatus.Invited) &&
      Math.floor((Date.now() - invitation_date.getTime()) / MS_PER_DAY) >
        STALE_AFTER_DAYS
  );
  if (staleUsers.length === 0) {
    return;
  }
  const statusCounts: Record<string, number> = {};
  for (const { status } of staleUsers) {
    statusCounts[status as string] = (statusCounts[status as string] ?? 0) + 1;
  }
  logApp.error(
    `Auth0 sync: ${staleUsers.length} users still waiting or invited after more than ${STALE_AFTER_DAYS} days`,
    {
      count: staleUsers.length,
      userIds: staleUsers.slice(0, MAX_LOGGED_USER_IDS).map(({ id }) => id),
      statusCounts,
    }
  );
};

const logNotGrantedUsers = (userIds: string[]) => {
  if (userIds.length === 0) {
    return;
  }
  logApp.error(
    `Auth0 sync: ${userIds.length} users could not be granted access`,
    { count: userIds.length, userIds: userIds.slice(0, MAX_LOGGED_USER_IDS) }
  );
};

export const UserAccountStatusSyncApp = {
  syncUserAccountStatusWithAuth0: async (
    options: Auth0SyncOptions = loadOptions()
  ): Promise<void> => {
    if (!isFeatureEnabled(FeatureFlag.TrialInvite)) {
      logApp.info('Auth0 sync skipped: TRIAL_INVITE disabled');
      return;
    }

    const startedAt = Date.now();

    // One extra row tells whether the cap was hit, without a count query.
    const loadedUsers = await UserDomain.loadUsersToSyncAccountStatus(
      options.maxUsersPerRun + 1
    );
    if (loadedUsers.length === 0) {
      logApp.info('Auth0 sync: no users to sync');
      return;
    }
    const isCapped = loadedUsers.length > options.maxUsersPerRun;
    const users = loadedUsers.slice(0, options.maxUsersPerRun);

    const waitingCount = users.filter(
      ({ status }) => status === UserAccountStatus.Waiting
    ).length;
    logApp.info(
      `Auth0 sync: ${users.length} users to process (${waitingCount} waiting, ${users.length - waitingCount} invited)`
    );
    if (isCapped) {
      logApp.warn(
        `Auth0 sync capped at max_users_per_run (${options.maxUsersPerRun}): remaining users will be synced by the next runs`
      );
    }

    const context: RunContext = {
      options,
      deadline: startedAt + options.deadlineMinutes * 60 * 1000,
      counters: {
        invited: 0,
        activated: 0,
        expired: 0,
        unchanged: 0,
        failed: 0,
        skipped: 0,
      },
      rateLimited: false,
      deadlineReached: false,
      notGrantedUserIds: [],
    };

    const { accountsByEmail, fetchedUsers } = await fetchAccounts(
      context,
      users
    );
    const grantTasks = await decideAll(context, fetchedUsers, accountsByEmail);
    await grantAll(context, grantTasks);

    logApp.info(buildSummary(startedAt, context.counters));
    logStaleUsers(users);
    logNotGrantedUsers(context.notGrantedUserIds);
  },
};
