import portalConfig from './config';
import { databaseContext } from './context/database.context';
import { UserLoadUserBy } from './model/user';
import { MemorySessionStore } from './stores/memory-session-store';
import { PostgreSQLSessionStore } from './stores/postgresql-session-store';
import { logApp } from './utils/app-logger.util';

let memoryStore: MemorySessionStore | undefined = undefined;
let postgresStore: PostgreSQLSessionStore | undefined = undefined;

/**
 * Get Memory Store instance
 */
const getMemoryStoreInstance = () => {
  if (!memoryStore) {
    memoryStore = new MemorySessionStore();
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

/**
 * Destroy every active session belonging to a user
 * This function works with both PostgreSQL and Memory stores
 * Inside a transaction, the PostgreSQL store deletes through it.
 */
export const destroyUserSessions = async (userId: string): Promise<void> => {
  try {
    const destroyedCount =
      await getSessionStoreInstance().destroySessionsOfUser(
        userId,
        databaseContext.getTransaction()
      );
    logApp.info(`Destroyed ${destroyedCount} sessions for user`, { userId });
  } catch (error) {
    logApp.error('Error destroying sessions for user:', { error, userId });
  }
};

/**
 * Whether the user holds at least one active session.
 * Resolves to true when the store cannot be read (the error is logged): the caller then
 * goes on with the refresh rather than leaving stale sessions behind.
 */
export const hasActiveUserSessions = async (
  userId: string
): Promise<boolean> => {
  try {
    return await getSessionStoreInstance().hasSessionsOfUser(
      userId,
      databaseContext.getTransaction()
    );
  } catch (error) {
    logApp.error('Error looking up the sessions of the user:', {
      error,
      userId,
    });
    return true;
  }
};

/**
 * Write the given user into every active session of that user, at once.
 * The user must come from `UserDomain.loadUserBy`: the session keeps the login shape,
 * with the selected organization capabilities the @auth directive reads.
 * Both stores update the existing sessions in place, never through `set`: a session destroyed
 * meanwhile (logout, disabled user) must not be re-inserted.
 * Store errors are logged, never thrown: the sessions are then left as they are.
 * Inside a transaction, the PostgreSQL store writes through it.
 * Callers go through `UserSessionHelper.updateUserSession`, which reloads the user under a lock
 * once the data is committed: a user loaded earlier may already be stale.
 */
export const refreshUserSessions = async (
  user: UserLoadUserBy
): Promise<void> => {
  const userId = user.id;
  try {
    const updatedCount = await getSessionStoreInstance().updateSessionsUser(
      userId,
      user,
      databaseContext.getTransaction()
    );
    logApp.info(`Updated ${updatedCount} sessions for user ${userId}`);
  } catch (error) {
    logApp.error('Error updating sessions for user:', { error, userId });
  }
};
