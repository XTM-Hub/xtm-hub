import { dbRaw } from '../../knexfile';

const POLL_INTERVAL_MS = 10;

/**
 * Whether a session of the test database waits for the advisory lock taken by
 * `withAdvisoryLock(namespace, key)`, which locks (hashtext(namespace), hashtext(key)).
 */
const hasWaiter = async (namespace: string, key: string): Promise<boolean> => {
  // pg_locks exposes the two int4 keys as unsigned oids
  const result = await dbRaw(
    `SELECT 1
     FROM pg_locks
     WHERE locktype = 'advisory'
       AND NOT granted
       AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
       AND objsubid = 2
       AND classid::bigint = (hashtext(?)::bigint & 4294967295)
       AND objid::bigint = (hashtext(?)::bigint & 4294967295)
     LIMIT 1`,
    [namespace, key]
  );
  return result.rows.length > 0;
};

/**
 * Resolves once a session waits for the advisory lock of `withAdvisoryLock(namespace, key)`,
 * or once `until` settles, whichever comes first. A test uses it to hold a lock holder back
 * until a competitor provably queues behind it, without guessing a delay.
 */
const waitForWaiter = async (
  namespace: string,
  key: string,
  until: Promise<unknown>
): Promise<void> => {
  let settled = false;
  until.then(
    () => (settled = true),
    () => (settled = true)
  );
  while (!settled && !(await hasWaiter(namespace, key))) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
};

export const TestAdvisoryLockHelper = {
  advisoryLock: {
    hasWaiter,
    waitForWaiter,
  },
};
