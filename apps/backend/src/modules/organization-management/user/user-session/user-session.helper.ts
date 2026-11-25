import {
  runAfterCommit,
  withAdvisoryLock,
} from '../../../../context/database.context';
import { UserId } from '../../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../../model/user';
import {
  destroyUserSessions,
  hasActiveUserSessions,
  refreshUserSessions,
} from '../../../../session-store-manager';
import { logApp } from '../../../../utils/app-logger.util';
import { getErrorMessage } from '../../../../utils/error/error-guard.util';
import { ErrorCode } from '../../../../utils/error/error.code';
import { UserDomain } from '../user-domain/user.domain';

// Serializes the reload and the write of the sessions of a user, see updateUserSession
export const USER_SESSIONS_LOCK_NAMESPACE = 'user-sessions';

type SessionUserReload =
  | { status: 'loaded'; user: UserLoadUserBy }
  | { status: 'revoked' }
  | { status: 'failed' };

/**
 * Reload the user exactly as the login does, so the session keeps the selected
 * organization capabilities the @auth directive reads.
 * `revoked` when the user can no longer hold a session (deleted or disabled),
 * `failed` when the reload itself fails (the error is logged).
 */
const reloadSessionUser = async (
  userId: UserId
): Promise<SessionUserReload> => {
  try {
    const user = await UserDomain.loadUserBy({ 'User.id': userId });
    if (!user) {
      logApp.info('User of the sessions to update not found', { userId });
      return { status: 'revoked' };
    }
    return { status: 'loaded', user };
  } catch (error) {
    if (getErrorMessage(error) === ErrorCode.UserDisabled) {
      logApp.info('User of the sessions to update is disabled', { userId });
      return { status: 'revoked' };
    }
    logApp.error('Error reloading the user of the sessions to update', {
      error,
      userId,
    });
    return { status: 'failed' };
  }
};

const refreshUnderLock = async (userId: UserId): Promise<void> => {
  const reload = await reloadSessionUser(userId);
  if (reload.status === 'failed') {
    return;
  }
  if (reload.status === 'revoked') {
    await destroyUserSessions(userId);
    return;
  }
  await refreshUserSessions(reload.user);
};

export const UserSessionHelper = {
  /**
   * Reload a user from the database and refresh every active session of that user.
   * When the user has no active session, nothing is reloaded.
   * When the user is deleted or disabled, the sessions are destroyed instead.
   * When the reload fails, the sessions are left as they are: a transient failure must not log the user out.
   * Inside a transaction, it runs once the outermost transaction commits: the reload must read
   * committed data.
   * The reload and the write run under a lock per user, in one transaction: two refreshes of the
   * same user cannot interleave, so a refresh that reloaded the user before a later change can no
   * longer write its stale snapshot over the one of the refresh that follows that change.
   * Errors are logged, never thrown.
   */
  updateUserSession: (userId: UserId): Promise<void> =>
    runAfterCommit(async () => {
      if (!(await hasActiveUserSessions(userId))) {
        logApp.debug('No active session to refresh for user', { userId });
        return;
      }
      try {
        await withAdvisoryLock(USER_SESSIONS_LOCK_NAMESPACE, userId, () =>
          refreshUnderLock(userId)
        );
      } catch (error) {
        logApp.error('Error refreshing the sessions of the user', {
          error,
          userId,
        });
      }
    }),
};
