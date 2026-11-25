import { AsyncLocalStorage } from 'async_hooks';
import { Knex } from 'knex';
import { database } from '../../knexfile';
import { UnknownErrorCode } from '../utils/error/error.code';

type AfterCommitCallback = () => Promise<void>;

interface DatabaseContext {
  transaction?: Knex.Transaction;
  afterCommitCallbacks?: AfterCommitCallback[];
}

const dbAsyncLocalStorage = new AsyncLocalStorage<DatabaseContext>();

export const databaseContext = {
  withTransaction: async <T>(callback: () => Promise<T>): Promise<T> => {
    // If we're already in a transaction context, reuse it
    const existingContext = dbAsyncLocalStorage.getStore();
    if (existingContext?.transaction) {
      return callback();
    }

    // Create a new transaction
    const afterCommitCallbacks: AfterCommitCallback[] = [];
    const result = await database.transaction(async (trx) => {
      const context: DatabaseContext = {
        transaction: trx,
        afterCommitCallbacks,
      };

      return dbAsyncLocalStorage.run(context, callback);
    });

    // Committed: run the deferred callbacks outside the transaction context,
    // so they read committed data through their own connection
    await dbAsyncLocalStorage.run({}, async () => {
      for (const afterCommitCallback of afterCommitCallbacks) {
        await afterCommitCallback();
      }
    });
    return result;
  },

  /**
   * Run a side effect outside the database (a session store write, for instance) only once
   * the data it relies on is committed. Inside a transaction, the callback is deferred until the
   * outermost transaction commits, and dropped if it rolls back. Outside a transaction, it runs at once.
   * A deferred callback that throws makes the outermost `withTransaction` throw, after the commit.
   */
  runAfterCommit: async (callback: AfterCommitCallback): Promise<void> => {
    const context = dbAsyncLocalStorage.getStore();
    if (context?.transaction && context.afterCommitCallbacks) {
      context.afterCommitCallbacks.push(callback);
      return;
    }
    await callback();
  },

  withAdvisoryLock: async <T>(
    namespace: string,
    key: string,
    callback: () => Promise<T>
  ): Promise<T> =>
    databaseContext.withTransaction(async () => {
      const transaction = databaseContext.getTransaction();
      if (!transaction) {
        throw new Error(UnknownErrorCode.UnknownError);
      }
      await transaction.raw(
        'SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))',
        [namespace, key]
      );
      return callback();
    }),

  getTransaction: (): Knex.Transaction | undefined => {
    return dbAsyncLocalStorage.getStore()?.transaction;
  },

  clearTransaction: (): void => {
    const context = dbAsyncLocalStorage.getStore();
    if (context) {
      delete context.transaction;
    }
  },

  isInTransaction: (): boolean => {
    return !!dbAsyncLocalStorage.getStore()?.transaction;
  },
};

export const { withAdvisoryLock, withTransaction, runAfterCommit } =
  databaseContext;
