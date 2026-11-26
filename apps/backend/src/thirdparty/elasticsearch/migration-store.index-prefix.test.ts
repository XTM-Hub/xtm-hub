import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { estypes } from '@elastic/elasticsearch';
import { MigrationSet } from 'migrate';
import type ElasticSearchService from './client';
import type { createEsStateStorage as CreateEsStateStorage } from './migration-store';
import { LOCK_DOC_ID } from './migration.const';

// The index names are resolved when the module loads: each case sets the prefix
// through the configuration, as ELASTIC_INDEX_PREFIX would, then reloads the store
const configuredPrefix = vi.hoisted(() => ({ value: '' }));

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof import('config') }>();
  return {
    default: {
      get: (key: string) =>
        key === 'elasticsearch.index_prefix'
          ? configuredPrefix.value
          : mod.default.get(key),
      has: mod.default.has.bind(mod.default),
    },
  };
});

const MIGRATION_TITLE = '1234567890-create-users.js';
const MIGRATION_TIMESTAMP = 1234567890;

const CREATED_RESPONSE: estypes.WriteResponseBase = {
  _id: MIGRATION_TITLE,
  _index: 'migrations',
  _version: 1,
  result: 'created',
  _shards: { total: 1, successful: 1, failed: 0 },
  _seq_no: 0,
  _primary_term: 1,
};
const DELETED_RESPONSE: estypes.WriteResponseBase = {
  ...CREATED_RESPONSE,
  result: 'deleted',
};

const emptyState = {
  lastRun: null,
  migrations: [],
};

const saveState = (
  storage: ReturnType<typeof CreateEsStateStorage>,
  set: Partial<MigrationSet>
) =>
  new Promise<void>((resolve, reject) => {
    storage.save(set as MigrationSet, (err) => (err ? reject(err) : resolve()));
  });

describe.each([
  ['no prefix is configured', '', 'migrations', 'migrations_lock'],
  ['a prefix is configured', 'hub', 'hub_migrations', 'hub_migrations_lock'],
])(
  'migration State Storage when %s',
  (_description, prefix, migrationIndex, lockIndex) => {
    let createEsStateStorage: typeof CreateEsStateStorage;
    let esService: ElasticSearchService;

    beforeAll(async () => {
      configuredPrefix.value = prefix;
      vi.resetModules();
      ({ createEsStateStorage } = await import('./migration-store'));
      const { default: ElasticSearchServiceClass } = await import('./client');
      esService = new ElasticSearchServiceClass();
    });

    it(`should load the migrations from ${migrationIndex}`, async () => {
      // Given
      const searchSpy = vi
        .spyOn(esService, 'simpleSearch')
        .mockResolvedValue([]);
      const storage = createEsStateStorage(esService, emptyState);

      // When
      await new Promise<void>((resolve) => storage.load(() => resolve()));

      // Then
      expect(searchSpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ index: migrationIndex })
      );
    });

    it(`should save an applied migration in ${migrationIndex}`, async () => {
      // Given
      const indexSpy = vi
        .spyOn(esService, 'index')
        .mockResolvedValue(CREATED_RESPONSE);
      const storage = createEsStateStorage(esService, emptyState);

      // When
      await saveState(storage, {
        migrations: [
          { title: MIGRATION_TITLE, timestamp: MIGRATION_TIMESTAMP },
        ] as MigrationSet['migrations'],
      });

      // Then
      expect(indexSpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ index: migrationIndex, id: MIGRATION_TITLE })
      );
    });

    it(`should delete a rolled back migration from ${migrationIndex}`, async () => {
      // Given
      const deleteSpy = vi
        .spyOn(esService, 'delete')
        .mockResolvedValue(DELETED_RESPONSE);
      const storage = createEsStateStorage(esService, {
        lastRun: MIGRATION_TITLE,
        migrations: [
          { title: MIGRATION_TITLE, timestamp: MIGRATION_TIMESTAMP },
        ],
      });

      // When
      await saveState(storage, {
        migrations: [
          { title: MIGRATION_TITLE, timestamp: null },
        ] as unknown as MigrationSet['migrations'],
      });

      // Then
      expect(deleteSpy).toHaveBeenCalledExactlyOnceWith({
        index: migrationIndex,
        id: MIGRATION_TITLE,
      });
    });

    it(`should create the lock in ${lockIndex}`, async () => {
      // Given
      const createSpy = vi
        .spyOn(esService, 'create')
        .mockResolvedValue(CREATED_RESPONSE);
      const storage = createEsStateStorage(esService, emptyState);

      // When
      await storage.lock();

      // Then
      expect(createSpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ index: lockIndex, id: LOCK_DOC_ID })
      );
    });

    it(`should delete the lock from ${lockIndex}`, async () => {
      // Given
      const deleteSpy = vi
        .spyOn(esService, 'delete')
        .mockResolvedValue(DELETED_RESPONSE);
      const storage = createEsStateStorage(esService, emptyState);

      // When
      await storage.unlock();

      // Then
      expect(deleteSpy).toHaveBeenCalledExactlyOnceWith({
        index: lockIndex,
        id: LOCK_DOC_ID,
      });
    });
  }
);
