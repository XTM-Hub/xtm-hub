import { database, db } from '../../knexfile';
import PlatformAssertionJti, {
  PlatformAssertionJtiJti,
} from '../../src/model/kanel/public/PlatformAssertionJti';

type MigrationDirection = 'up' | 'down';

export const TestPlatformAssertionHelper = {
  platformAssertionJti: {
    create: async ({
      jti,
      expires_at,
    }: {
      jti: string;
      expires_at: Date;
    }): Promise<void> => {
      await db<PlatformAssertionJti>('PlatformAssertionJti').insert({
        jti: jti as PlatformAssertionJtiJti,
        expires_at,
      });
    },
    loadAll: async (jtis: string[]): Promise<PlatformAssertionJti[]> => {
      return db<PlatformAssertionJti[]>('PlatformAssertionJti')
        .whereIn('jti', jtis)
        .select('*');
    },
    deleteAll: async (jtis: string[]): Promise<void> => {
      await db<PlatformAssertionJti>('PlatformAssertionJti')
        .whereIn('jti', jtis)
        .del();
    },
  },
  migration: {
    run: async (
      fileName: string,
      direction: MigrationDirection
    ): Promise<void> => {
      const migration = (await import(
        `../../src/migrations/${fileName}.js`
      )) as {
        up: (knex: typeof database) => Promise<void>;
        down: (knex: typeof database) => Promise<void>;
      };
      await migration[direction](database);
    },
    hasTable: (table: string): Promise<boolean> =>
      database.schema.hasTable(table),
    hasColumn: (table: string, column: string): Promise<boolean> =>
      database.schema.hasColumn(table, column),
  },
};
