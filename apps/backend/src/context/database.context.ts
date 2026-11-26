import { AsyncLocalStorage } from 'async_hooks';
import { Knex } from 'knex';
import { database } from '../../knexfile';
import { UnknownErrorCode } from '../utils/error/error.code';

interface DatabaseContext {
  transaction?: Knex.Transaction;
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
    return database.transaction(async (trx) => {
      const context: DatabaseContext = { transaction: trx };

      return dbAsyncLocalStorage.run(context, async () => {
        const result = await callback();
        return result;
      });
    });
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

export const { withAdvisoryLock, withTransaction } = databaseContext;
