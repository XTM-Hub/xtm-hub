import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  ManifestType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import { ManifestKey, ManifestRebuildQueueStatus } from './manifest.consts';
import { ManifestDomain } from './manifest.domain';

const MANIFEST_KEY: ManifestKey = {
  platformIdentifier: PlatformIdentifier.Opencti,
  version: '6.4.0',
  type: ManifestType.Connector,
};

describe('manifestDomain', () => {
  describe('loadPendingManifestsForProcessing', () => {
    afterEach(async () => {
      await TestHelper.manifestRebuildQueue.delete({});
    });

    it('should return an empty array when the queue is empty', async () => {
      const result = await ManifestDomain.loadPendingManifestsForProcessing(
        undefined,
        randomUUID()
      );
      expect(result).toEqual([]);
    });

    it('should return all pending rows and flip their status to processing', async () => {
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Openaev,
        version: '1.0.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });

      const result = await ManifestDomain.loadPendingManifestsForProcessing(
        undefined,
        randomUUID()
      );

      expect(result).toHaveLength(2);
      const rows = await TestHelper.manifestRebuildQueue.loadAll({});
      expect(
        rows.every((r) => r.status === ManifestRebuildQueueStatus.Processing)
      ).toBe(true);
    });

    it('should only pick up pending rows, leaving processing rows untouched', async () => {
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Openaev,
        version: '1.0.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Processing,
      });

      const result = await ManifestDomain.loadPendingManifestsForProcessing(
        undefined,
        randomUUID()
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.product).toBe(PlatformIdentifier.Opencti);
    });

    it('should only process rows matching the filter when one is provided', async () => {
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Openaev,
        version: '1.0.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });

      const result = await ManifestDomain.loadPendingManifestsForProcessing(
        MANIFEST_KEY,
        randomUUID()
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.product).toBe(PlatformIdentifier.Opencti);
      const untouched = await TestHelper.manifestRebuildQueue.load({
        product: PlatformIdentifier.Openaev,
      });
      expect(untouched!.status).toBe(ManifestRebuildQueueStatus.Pending);
    });
    it('should skip a pending row when a processing row already exists for the same key', async () => {
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Processing,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });

      const result = await ManifestDomain.loadPendingManifestsForProcessing(
        MANIFEST_KEY,
        randomUUID()
      );

      expect(result).toHaveLength(0);
      const rows = await TestHelper.manifestRebuildQueue.loadAll({
        product: PlatformIdentifier.Opencti,
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.status).sort()).toEqual(
        [
          ManifestRebuildQueueStatus.Pending,
          ManifestRebuildQueueStatus.Processing,
        ].sort()
      );
    });
  });

  describe('insertIfNotPending', () => {
    afterEach(async () => {
      await TestHelper.manifestRebuildQueue.delete({});
    });

    describe('when the queue is empty', () => {
      it('should insert a row with status pending', async () => {
        await ManifestDomain.insertIfNotPending(MANIFEST_KEY);

        const rows = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(rows).toHaveLength(1);
        expect(rows[0]!.status).toBe(ManifestRebuildQueueStatus.Pending);
      });

      it('should store the exact product, version and type provided', async () => {
        await ManifestDomain.insertIfNotPending(MANIFEST_KEY);

        const rows = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(rows[0]).toMatchObject({
          product: PlatformIdentifier.Opencti,
          version: '6.4.0',
          type: ManifestType.Connector,
        });
      });

      it('should set created_at', async () => {
        await ManifestDomain.insertIfNotPending(MANIFEST_KEY);

        const rows = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(rows[0]!.created_at).toBeInstanceOf(Date);
      });
    });

    describe('when a row with the same (product, version, type) already exists', () => {
      it.each`
        existingStatus                           | expectedCount | description
        ${ManifestRebuildQueueStatus.Pending}    | ${1}          | ${'does nothing — already queued'}
        ${ManifestRebuildQueueStatus.Processing} | ${2}          | ${'adds a new pending row — re-queued for after processing'}
      `(
        'when status is "$existingStatus": $description',
        async ({
          existingStatus,
          expectedCount,
        }: {
          existingStatus: ManifestRebuildQueueStatus;
          expectedCount: number;
        }) => {
          await TestHelper.manifestRebuildQueue.create({
            status: existingStatus,
          });

          await expect(
            ManifestDomain.insertIfNotPending(MANIFEST_KEY)
          ).resolves.not.toThrow();

          const rows = await TestHelper.manifestRebuildQueue.loadAll({});
          expect(rows).toHaveLength(expectedCount);
        }
      );
    });

    describe('when only part of the unique triple matches', () => {
      it.each`
        description            | platformIdentifier            | version    | type
        ${'different version'} | ${PlatformIdentifier.Opencti} | ${'7.0.0'} | ${ManifestType.Connector}
        ${'different product'} | ${PlatformIdentifier.Openaev} | ${'6.4.0'} | ${ManifestType.Connector}
      `(
        'should insert a new row when $description',
        async ({ platformIdentifier, version, type }: ManifestKey) => {
          await TestHelper.manifestRebuildQueue.create({});

          await ManifestDomain.insertIfNotPending({
            platformIdentifier,
            version,
            type,
          });

          const rows = await TestHelper.manifestRebuildQueue.loadAll({});
          expect(rows).toHaveLength(2);
        }
      );
    });

    describe('when called with an array of keys', () => {
      it('should do nothing when the array is empty', async () => {
        await ManifestDomain.insertIfNotPending([]);

        const rows = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(rows).toHaveLength(0);
      });

      it('should insert one pending row per distinct key in a single call', async () => {
        await ManifestDomain.insertIfNotPending([
          MANIFEST_KEY,
          {
            platformIdentifier: PlatformIdentifier.Openaev,
            version: '1.0.0',
            type: ManifestType.Connector,
          },
        ]);

        const rows = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(rows).toHaveLength(2);
        expect(
          rows.every((r) => r.status === ManifestRebuildQueueStatus.Pending)
        ).toBe(true);
      });

      it('should skip keys already pending while still inserting the others', async () => {
        await TestHelper.manifestRebuildQueue.create({
          product: PlatformIdentifier.Opencti,
          version: '6.4.0',
          type: ManifestType.Connector,
          status: ManifestRebuildQueueStatus.Pending,
        });

        await ManifestDomain.insertIfNotPending([
          MANIFEST_KEY,
          {
            platformIdentifier: PlatformIdentifier.Openaev,
            version: '1.0.0',
            type: ManifestType.Connector,
          },
        ]);

        const rows = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(rows).toHaveLength(2);
      });

      it('should not throw and insert a single row when the array contains duplicate keys', async () => {
        await expect(
          ManifestDomain.insertIfNotPending([MANIFEST_KEY, MANIFEST_KEY])
        ).resolves.not.toThrow();

        const rows = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(rows).toHaveLength(1);
        expect(rows[0]!.status).toBe(ManifestRebuildQueueStatus.Pending);
      });
    });
  });

  describe('loadDistinctManifestsAboveVersion', () => {
    afterEach(async () => {
      await TestHelper.manifest.delete({});
    });

    it('should return an empty array when no manifest exists', async () => {
      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        false,
        ManifestType.Connector
      );
      expect(result).toEqual([]);
    });

    it('should include manifests whose version_padded is equal to the threshold', async () => {
      await TestHelper.manifest.create({
        version: '6.4.0',
        version_padded: '006.000004.000',
      });

      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        false,
        ManifestType.Connector
      );

      expect(result).toEqual([
        expect.objectContaining({
          product: PlatformIdentifier.Opencti,
          version: '6.4.0',
        }),
      ]);
    });

    it('should include manifests whose version_padded is above the threshold', async () => {
      await TestHelper.manifest.create({
        version: '7.0.0',
        version_padded: '007.000000.000',
      });

      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        false,
        ManifestType.Connector
      );

      expect(result).toEqual([
        expect.objectContaining({
          product: PlatformIdentifier.Opencti,
          version: '7.0.0',
        }),
      ]);
    });

    it('should exclude manifests whose version_padded is below the threshold', async () => {
      await TestHelper.manifest.create({
        version: '6.0.0',
        version_padded: '006.000000.000',
      });

      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        false,
        ManifestType.Connector
      );

      expect(result).toEqual([]);
    });

    it('should exclude manifests of a different type', async () => {
      await TestHelper.manifest.create({
        version: '7.0.0',
        version_padded: '007.000000.000',
        // ManifestType currently only exposes Connector; cast a distinct
        // raw value to exercise the type filter against a non-connector row.
        type: 'other_type' as ManifestType,
      });

      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        false,
        ManifestType.Connector
      );

      expect(result).toEqual([]);
    });

    it('should deduplicate multiple manifest rows sharing the same (product, version)', async () => {
      await TestHelper.manifest.create({
        version: '7.0.0',
        version_padded: '007.000000.000',
        name: 'manifest-1',
      });
      await TestHelper.manifest.create({
        version: '7.0.0',
        version_padded: '007.000000.000',
        name: 'manifest-2',
      });

      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        false,
        ManifestType.Connector
      );

      expect(result).toEqual([
        expect.objectContaining({
          product: PlatformIdentifier.Opencti,
          version: '7.0.0',
        }),
      ]);
    });

    it('should return distinct entries for different products', async () => {
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Opencti,
        version: '7.0.0',
        version_padded: '007.000000.000',
      });
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Openaev,
        version: '7.0.0',
        version_padded: '007.000000.000',
      });

      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        false,
        ManifestType.Connector
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            product: PlatformIdentifier.Opencti,
            version: '7.0.0',
          }),
          expect.objectContaining({
            product: PlatformIdentifier.Openaev,
            version: '7.0.0',
          }),
        ])
      );
    });

    it('should only include LTS-tagged manifests when isLts is true', async () => {
      await TestHelper.manifest.create({
        version: '7.260309.0-lts.5',
        version_padded: '007.260309.000.LTS.005',
      });
      await TestHelper.manifest.create({
        version: '7.0.0',
        version_padded: '007.000000.000',
      });

      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        true,
        ManifestType.Connector
      );

      expect(result).toEqual([
        expect.objectContaining({
          product: PlatformIdentifier.Opencti,
          version: '7.260309.0-lts.5',
        }),
      ]);
    });

    it('should only include non-LTS manifests when isLts is false', async () => {
      await TestHelper.manifest.create({
        version: '7.260309.0-lts.5',
        version_padded: '007.260309.000.LTS.005',
      });
      await TestHelper.manifest.create({
        version: '7.0.0',
        version_padded: '007.000000.000',
      });

      const result = await ManifestDomain.loadDistinctManifestsAboveVersion(
        '006.000004.000',
        false,
        ManifestType.Connector
      );

      expect(result).toEqual([
        expect.objectContaining({
          product: PlatformIdentifier.Opencti,
          version: '7.0.0',
        }),
      ]);
    });
  });

  describe('recoverStuckProcessingEntries', () => {
    afterEach(async () => {
      await TestHelper.manifestRebuildQueue.delete({});
    });

    it('should return an empty array when the queue is empty', async () => {
      const result = await ManifestDomain.recoverStuckProcessingEntries();
      expect(result).toEqual([]);
    });

    it.each`
      description                  | status                                   | ageMinutes
      ${'a recent processing row'} | ${ManifestRebuildQueueStatus.Processing} | ${10}
      ${'an old pending row'}      | ${ManifestRebuildQueueStatus.Pending}    | ${40}
    `(
      'should do nothing and leave the status unchanged for $description',
      async ({
        status,
        ageMinutes,
      }: {
        status: ManifestRebuildQueueStatus;
        ageMinutes: number;
      }) => {
        await TestHelper.manifestRebuildQueue.create({
          product: PlatformIdentifier.Opencti,
          version: '6.4.0',
          type: ManifestType.Connector,
          status,
          created_at: new Date(Date.now() - ageMinutes * 60 * 1000),
        });

        const result = await ManifestDomain.recoverStuckProcessingEntries();

        expect(result).toEqual([]);
        const row = await TestHelper.manifestRebuildQueue.load({
          product: PlatformIdentifier.Opencti,
        });
        expect(row!.status).toBe(status);
      }
    );

    it('should reset a processing row older than 30 minutes back to pending and return it', async () => {
      const fortyMinutesAgo = new Date(Date.now() - 40 * 60 * 1000);
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Processing,
        created_at: fortyMinutesAgo,
      });

      const result = await ManifestDomain.recoverStuckProcessingEntries();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });
      const row = await TestHelper.manifestRebuildQueue.load({
        product: PlatformIdentifier.Opencti,
      });
      expect(row!.status).toBe(ManifestRebuildQueueStatus.Pending);
    });

    it('should reset only the old processing rows, leaving recent processing rows untouched', async () => {
      const fortyMinutesAgo = new Date(Date.now() - 40 * 60 * 1000);
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Processing,
        created_at: fortyMinutesAgo,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Openaev,
        version: '1.0.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Processing,
        created_at: new Date(),
      });

      const result = await ManifestDomain.recoverStuckProcessingEntries();

      expect(result).toHaveLength(1);
      expect(result[0]!.product).toBe(PlatformIdentifier.Opencti);
      const recentRow = await TestHelper.manifestRebuildQueue.load({
        product: PlatformIdentifier.Openaev,
      });
      expect(recentRow!.status).toBe(ManifestRebuildQueueStatus.Processing);
    });

    it('should delete a stuck processing row instead of resetting it when a fresher pending row for the same key already exists', async () => {
      const fortyMinutesAgo = new Date(Date.now() - 40 * 60 * 1000);
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Processing,
        created_at: fortyMinutesAgo,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });

      const result = await ManifestDomain.recoverStuckProcessingEntries();

      expect(result).toEqual([]);
      const processingRow = await TestHelper.manifestRebuildQueue.load({
        product: PlatformIdentifier.Opencti,
        status: ManifestRebuildQueueStatus.Processing,
      });
      expect(processingRow).toBeUndefined();
      const pendingRow = await TestHelper.manifestRebuildQueue.load({
        product: PlatformIdentifier.Opencti,
        status: ManifestRebuildQueueStatus.Pending,
      });
      expect(pendingRow).toBeDefined();
    });
  });
  describe('loadManifests', () => {
    afterEach(async () => {
      await TestHelper.manifest.delete({});
    });

    it('should return an empty array when no manifest matches', async () => {
      const result = await ManifestDomain.loadManifests(
        PlatformIdentifier.Opencti,
        '6.4.0',
        ManifestType.Connector,
        10
      );

      expect(result).toEqual([]);
    });

    it('should only return manifests matching the product, version and type', async () => {
      await TestHelper.manifest.create({
        version: '6.4.0',
        version_padded: '006.000004.000',
        name: 'expected',
      });
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Openaev,
        version: '6.4.0',
        version_padded: '006.000004.000',
        name: 'other-product',
      });
      await TestHelper.manifest.create({
        version: '7.0.0',
        version_padded: '007.000000.000',
        name: 'other-version',
      });

      const result = await ManifestDomain.loadManifests(
        PlatformIdentifier.Opencti,
        '6.4.0',
        ManifestType.Connector,
        10
      );

      expect(result).toEqual([expect.objectContaining({ name: 'expected' })]);
    });

    it('should return the most recently created manifest first', async () => {
      await TestHelper.manifest.create({
        version: '6.4.0',
        version_padded: '006.000004.000',
        name: 'older',
        created_at: new Date(Date.now() - 60 * 1000),
      });
      await TestHelper.manifest.create({
        version: '6.4.0',
        version_padded: '006.000004.000',
        name: 'newer',
        created_at: new Date(),
      });

      const result = await ManifestDomain.loadManifests(
        PlatformIdentifier.Opencti,
        '6.4.0',
        ManifestType.Connector,
        10
      );

      expect(result.map((row) => row.name)).toEqual(['newer', 'older']);
    });

    it.each`
      count | expectedLength | description
      ${1}  | ${1}           | ${'limits the result to the requested count'}
      ${0}  | ${1}           | ${'clamps a count below 1 up to 1'}
      ${-5} | ${1}           | ${'clamps a negative count up to 1'}
    `(
      'should return $expectedLength row(s) when count is $count ($description)',
      async ({ count, expectedLength }) => {
        await TestHelper.manifest.create({
          version: '6.4.0',
          version_padded: '006.000004.000',
          name: 'first',
        });
        await TestHelper.manifest.create({
          version: '6.4.0',
          version_padded: '006.000004.000',
          name: 'second',
        });

        const result = await ManifestDomain.loadManifests(
          PlatformIdentifier.Opencti,
          '6.4.0',
          ManifestType.Connector,
          count
        );

        expect(result).toHaveLength(expectedLength);
      }
    );
  });

  describe('getManifestByName', () => {
    afterEach(async () => {
      await TestHelper.manifest.delete({});
    });

    it('should return the manifest matching the name', async () => {
      await TestHelper.manifest.create({
        version: '6.4.0',
        version_padded: '006.000004.000',
        name: 'manifest-1',
      });

      const result = await ManifestDomain.getManifestByName(
        PlatformIdentifier.Opencti,
        '6.4.0',
        ManifestType.Connector,
        'manifest-1'
      );

      expect(result).toEqual(expect.objectContaining({ name: 'manifest-1' }));
    });

    it('should return undefined when the name is unknown', async () => {
      const result = await ManifestDomain.getManifestByName(
        PlatformIdentifier.Opencti,
        '6.4.0',
        ManifestType.Connector,
        'unknown-manifest'
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when the name exists under a different product', async () => {
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Openaev,
        version: '6.4.0',
        version_padded: '006.000004.000',
        name: 'manifest-1',
      });

      const result = await ManifestDomain.getManifestByName(
        PlatformIdentifier.Opencti,
        '6.4.0',
        ManifestType.Connector,
        'manifest-1'
      );

      expect(result).toBeUndefined();
    });
  });
});
