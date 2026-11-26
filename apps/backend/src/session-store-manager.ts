import { MemoryStore, SessionData } from 'express-session';
import portalConfig from './config';
import { UserLoadUserBy, UserWithOrganizationsAndRole } from './model/user';
import { PostgreSQLSessionStore } from './stores/postgresql-session-store';
import { logApp } from './utils/app-logger.util';

let memoryStore: MemoryStore | undefined = undefined;
let postgresStore: PostgreSQLSessionStore | undefined = undefined;

/**
 * Get Memory Store instance
 */
const getMemoryStoreInstance = () => {
  if (!memoryStore) {
    memoryStore = new MemoryStore({});
  }
  return memoryStore;
};

/**
 * Get PostgreSQL Store instance
 */
const getPostgreSQLStoreInstance = () => {
  if (!postgresStore) {
    postgresStore = new PostgreSQLSessionStore();
  }
  return postgresStore;
};

/**
 * Get session store instance based on configuration
 */
export const getSessionStoreInstance = () => {
  const storeType = portalConfig.session_store.type;

  switch (storeType) {
    case 'postgresql':
      logApp.info('Using PostgreSQL Session Store');
      return getPostgreSQLStoreInstance();
    case 'memory':
      logApp.info('Using Memory Session Store');
      return getMemoryStoreInstance();
    default:
      logApp.warn(
        `Unknown session store type: ${storeType}, defaulting to PostgreSQL`
      );
      return getPostgreSQLStoreInstance();
  }
};

const getSessionsForUser = (
  sessions: Record<string, SessionData> | null | undefined,
  userId: string
): string[] => {
  if (!sessions) return [];

  return Object.keys(sessions).filter((id) => {
    const session = sessions[id] as SessionData & { user?: UserLoadUserBy };
    return session.user?.id === userId;
  });
};

/**
 * Destroy every active session belonging to a user
 * This function works with both PostgreSQL and Memory stores
 */
export const destroyUserSessions = (userId: string): Promise<void> => {
  const storeInstance = getSessionStoreInstance();

  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storeInstance.all((err: any, sessions: any) => {
      if (err) {
        logApp.error('Error retrieving sessions for user deletion:', {
          error: err,
        });
        resolve();
        return;
      }

      const sessionIds = getSessionsForUser(
        sessions as Record<string, SessionData> | null | undefined,
        userId
      );

      if (sessionIds.length === 0) {
        logApp.debug(`No active sessions found for user ${userId}`);
        resolve();
        return;
      }

      logApp.info(`Destroying ${sessionIds.length} sessions for user`, {
        userId,
      });

      let remaining = sessionIds.length;
      sessionIds.forEach((sessionId) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        storeInstance.destroy(sessionId, (error?: any) => {
          if (error) {
            logApp.error(`Error destroying session ${sessionId}:`, { error });
          }
          remaining -= 1;
          if (remaining === 0) {
            resolve();
          }
        });
      });
    });
  });
};

/**
 * Update user session data across all active sessions
 * This function works with both PostgreSQL and Memory stores
 */
export const updateUserSession = (
  user: UserWithOrganizationsAndRole
): Promise<void> => {
  const storeInstance = getSessionStoreInstance();

  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storeInstance.all((err: any, sessions: any) => {
      if (err) {
        logApp.error('Error retrieving sessions for user update:', {
          error: err,
        });
        resolve();
        return;
      }

      if (!sessions) {
        logApp.debug('No sessions found for user update');
        resolve();
        return;
      }

      if (!user?.id) {
        logApp.warn('Cannot update sessions: user is missing or has no id');
        resolve();
        return;
      }

      // Handle sessions as object
      const typedSessions = sessions as Record<string, SessionData>;
      const sessionIds = getSessionsForUser(typedSessions, user.id);

      if (sessionIds.length === 0) {
        logApp.debug(`No active sessions found for user ${user.id}`);
        resolve();
        return;
      }

      logApp.info(`Updating ${sessionIds.length} sessions for user ${user.id}`);

      let remaining = sessionIds.length;
      sessionIds.forEach((sessionId) => {
        const sessionToUpdate = typedSessions[sessionId] as SessionData & {
          user?: UserLoadUserBy;
        };
        sessionToUpdate.user = user as UserLoadUserBy;

        storeInstance.set(
          sessionId,
          sessionToUpdate as SessionData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error?: any) => {
            if (error) {
              logApp.error(`Error updating session ${sessionId}:`, { error });
            } else {
              logApp.debug(`USER_SESSION_UPDATED for session ${sessionId}`);
            }
            remaining -= 1;
            if (remaining === 0) {
              resolve();
            }
          }
        );
      });
    });
  });
};
