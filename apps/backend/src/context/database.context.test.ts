import { Knex } from 'knex';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { database, db } from '../../knexfile';
import { databaseContext } from './database.context';

interface TestTable {
  id: number;
  name: string;
}

const createItem = async (name: string) => {
  // eslint-disable-next-line no-restricted-syntax
  const [item] = await db<TestTable>('TestTable')
    .insert({ name })
    .returning('*');
  return item;
};

const countItems = async (): Promise<number> => {
  // eslint-disable-next-line no-restricted-syntax
  const [{ count }] = await db<TestTable>('TestTable').count('* as count');
  return Number(count);
};

describe('databaseContext Tests', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('TestTable');
    await database.schema.createTable('TestTable', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
    });
  });

  beforeEach(async () => {
    // eslint-disable-next-line no-restricted-syntax
    await db<TestTable>('TestTable').del();
    databaseContext.clearTransaction();
  });

  afterAll(async () => {
    await database.schema.dropTableIfExists('TestTable');
  });

  describe('transaction context', () => {
    it('should have no transaction context outside withTransaction', () => {
      expect(databaseContext.isInTransaction()).toBe(false);
      expect(databaseContext.getTransaction()).toBeUndefined();
    });

    it('should have transaction context inside withTransaction', async () => {
      await databaseContext.withTransaction(async () => {
        expect(databaseContext.isInTransaction()).toBe(true);
        expect(databaseContext.getTransaction()).toBeDefined();
      });
    });

    it('should clear transaction context after withTransaction', async () => {
      await databaseContext.withTransaction(async () => {});

      expect(databaseContext.isInTransaction()).toBe(false);
      expect(databaseContext.getTransaction()).toBeUndefined();
    });

    it('should clear context even after error', async () => {
      await expect(
        databaseContext.withTransaction(async () => {
          expect(databaseContext.isInTransaction()).toBe(true);
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(databaseContext.isInTransaction()).toBe(false);
      expect(databaseContext.getTransaction()).toBeUndefined();
    });

    it('should reuse same transaction in nested calls', async () => {
      let outerTx: Knex.Transaction | undefined;
      let innerTx: Knex.Transaction | undefined;

      await databaseContext.withTransaction(async () => {
        outerTx = databaseContext.getTransaction();

        await databaseContext.withTransaction(async () => {
          innerTx = databaseContext.getTransaction();
        });
      });

      expect(outerTx).toBe(innerTx);
      expect(outerTx).toBeDefined();
    });

    it('should isolate contexts between concurrent operations', async () => {
      const transactions: {
        op: string;
        tx: Knex.Transaction | undefined;
        isInTx: boolean;
      }[] = [];

      const op1 = databaseContext.withTransaction(async () => {
        transactions.push({
          op: 'op1',
          tx: databaseContext.getTransaction(),
          isInTx: databaseContext.isInTransaction(),
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      await new Promise((resolve) => setTimeout(resolve, 25));

      const op2 = databaseContext.withTransaction(async () => {
        transactions.push({
          op: 'op2',
          tx: databaseContext.getTransaction(),
          isInTx: databaseContext.isInTransaction(),
        });
      });

      const op3 = (async () => {
        transactions.push({
          op: 'op3',
          tx: databaseContext.getTransaction(),
          isInTx: databaseContext.isInTransaction(),
        });
      })();

      await Promise.all([op1, op2, op3]);

      const op1Result = transactions.find((t) => t.op === 'op1');
      const op2Result = transactions.find((t) => t.op === 'op2');
      const op3Result = transactions.find((t) => t.op === 'op3');

      // Op1 and Op2 should have different transactions
      expect(op1Result?.isInTx).toBe(true);
      expect(op2Result?.isInTx).toBe(true);
      expect(op3Result?.isInTx).toBe(false);
      expect(op1Result?.tx).not.toBe(op2Result?.tx);
      expect(op3Result?.tx).toBeUndefined();
    });
  });

  describe('transaction behavior', () => {
    it('should commit all operations when transaction succeeds', async () => {
      expect(await countItems()).toBe(0);

      await databaseContext.withTransaction(async () => {
        await createItem('item1');
        await createItem('item2');
        await createItem('item3');

        expect(await countItems()).toBe(3);
      });

      // All operations should be committed
      expect(await countItems()).toBe(3);
    });

    it('should rollback all operations when transaction fails', async () => {
      expect(await countItems()).toBe(0);

      await expect(
        databaseContext.withTransaction(async () => {
          await createItem('item1');
          await createItem('item2');

          // Verify operations are visible within transaction
          expect(await countItems()).toBe(2);

          // Force transaction to fail
          throw new Error('Transaction should rollback');
        })
      ).rejects.toThrow('Transaction should rollback');

      // All operations should be rolled back
      expect(await countItems()).toBe(0);
    });
  });

  describe('advisory lock', () => {
    const namespace = 'database-context-test';

    const countLocks = async (
      key: string,
      granted: boolean
    ): Promise<number> => {
      const { rows } = await database.raw(
        `SELECT count(*)::int AS count
         FROM pg_locks
         WHERE locktype = 'advisory'
           AND classid = hashtext(?)::int
           AND objid = hashtext(?)::int
           AND granted = ?`,
        [namespace, key, granted]
      );
      return rows[0].count;
    };

    const countHeldLocks = (key: string): Promise<number> =>
      countLocks(key, true);

    const waitForLockCount = async (
      key: string,
      granted: boolean,
      expected: number
    ): Promise<void> => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if ((await countLocks(key, granted)) === expected) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error(
        `Timed out waiting for ${expected} ${granted ? 'granted' : 'waiting'} lock(s) on '${key}'`
      );
    };

    it('should hold the lock inside the callback and release it on commit', async () => {
      let heldDuringCallback: number | undefined;

      await databaseContext.withAdvisoryLock(namespace, 'commit', async () => {
        expect(databaseContext.isInTransaction()).toBe(true);
        heldDuringCallback = await countHeldLocks('commit');
      });

      expect(heldDuringCallback).toBe(1);
      expect(await countHeldLocks('commit')).toBe(0);
    });

    it('should release the lock when the callback throws', async () => {
      await expect(
        databaseContext.withAdvisoryLock(namespace, 'rollback', async () => {
          await createItem('item1');
          throw new Error('Advisory lock should rollback');
        })
      ).rejects.toThrow('Advisory lock should rollback');

      expect(await countHeldLocks('rollback')).toBe(0);
      expect(await countItems()).toBe(0);
    });

    it('should serialize concurrent callers on the same key', async () => {
      const events: string[] = [];
      let releaseFirst!: () => void;
      const firstMayFinish = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      const first = databaseContext.withAdvisoryLock(
        namespace,
        'shared',
        async () => {
          events.push('first-in');
          await firstMayFinish;
          events.push('first-out');
        }
      );
      await waitForLockCount('shared', true, 1);

      const second = databaseContext.withAdvisoryLock(
        namespace,
        'shared',
        async () => {
          events.push('second-in');
        }
      );
      await waitForLockCount('shared', false, 1);

      releaseFirst();
      await Promise.all([first, second]);

      expect(events).toEqual(['first-in', 'first-out', 'second-in']);
    });

    it('should not block concurrent callers on different keys', async () => {
      const events: string[] = [];
      let releaseFirst!: () => void;
      const firstMayFinish = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      const first = databaseContext.withAdvisoryLock(
        namespace,
        'key-a',
        async () => {
          events.push('first-in');
          await firstMayFinish;
          events.push('first-out');
        }
      );
      await waitForLockCount('key-a', true, 1);

      await databaseContext.withAdvisoryLock(namespace, 'key-b', async () => {
        events.push('second-in');
      });

      releaseFirst();
      await first;

      expect(events).toEqual(['first-in', 'second-in', 'first-out']);
    });

    it('should reuse the surrounding transaction', async () => {
      let outerTx: Knex.Transaction | undefined;
      let lockedTx: Knex.Transaction | undefined;

      await databaseContext.withTransaction(async () => {
        outerTx = databaseContext.getTransaction();

        await databaseContext.withAdvisoryLock(
          namespace,
          'nested',
          async () => {
            lockedTx = databaseContext.getTransaction();
          }
        );
      });

      expect(lockedTx).toBe(outerTx);
      expect(lockedTx).toBeDefined();
    });
  });
});
