import { randomUUID } from 'node:crypto';
import { Readable } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_USE_CASES } from '../../../../tests/tests.const';
import {
  DocumentImageType,
  DocumentMetadataKeyCode,
  IntegrationType,
  ManifestType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import type Document from '../../../model/kanel/public/Document';
import type { DocumentMetadataKey } from '../../../model/kanel/public/DocumentMetadata';
import type { ObjectUseCaseObjectId } from '../../../model/kanel/public/ObjectUseCase';
import { MinIOClient } from '../../../thirdparty/minio/client';
import { logApp } from '../../../utils/app-logger.util';
import {
  BadRequestErrorCode,
  UnknownErrorCode,
} from '../../../utils/error/error.code';
import { DocumentChildrenDomain } from '../../document/domain/document.children.domain';
import { DocumentDomain } from '../../document/domain/document.domain';
import {
  ManifestFragmentHelper,
  TAG_DECOUPLING,
  TAG_LATEST,
  TAG_LATEST_LTS,
} from '../manifest-fragment/manifest-fragment.helper';
import { INTEGRATION_SERVICE_INSTANCE_ID } from '../opencti/integration/integration.model';
import { ManifestApp } from './manifest.app';
import type { ManifestKey } from './manifest.consts';
import { ManifestRebuildQueueStatus } from './manifest.consts';
import { ManifestDomain } from './manifest.domain';
import { ManifestHelper } from './manifest.helper';
import type { ManifestOutput } from './manifest.types';

const MANIFEST_KEY: ManifestKey = {
  platformIdentifier: PlatformIdentifier.Opencti,
  version: '7.260309.0',
  type: ManifestType.Connector,
};

const LTS_KEY: ManifestKey = {
  platformIdentifier: PlatformIdentifier.Opencti,
  version: '7.260309.0-lts.5',
  type: ManifestType.Connector,
};

const createConnectorDocument = async (tags: string[]): Promise<Document> => {
  const doc = await TestHelper.document.create({
    active: true,
    is_decommissioned: false,
    tags: [...tags, TAG_DECOUPLING],
  });
  await TestHelper.documentMetadata.create({
    document_id: doc.id,
    key: DocumentMetadataKeyCode.IntegrationType as unknown as DocumentMetadataKey,
    value: IntegrationType.Connector,
  });
  return doc;
};

const createConnectorWithFragment = async ({
  manifestFragmentId,
  slug = `connector-${manifestFragmentId}`,
  minimumDeployableVersionPadded,
  tags = [],
  version = '7.260309.0',
  active = true,
  isDecommissioned = false,
}: {
  manifestFragmentId: string;
  slug?: string;
  minimumDeployableVersionPadded?: string;
  tags?: string[];
  version?: string;
  active?: boolean;
  isDecommissioned?: boolean;
}): Promise<Document> => {
  const doc = await TestHelper.document.create({
    active,
    is_decommissioned: isDecommissioned,
    tags: tags.length > 0 ? [...tags, TAG_DECOUPLING] : [],
    version,
    slug,
  });
  await TestHelper.documentMetadata.create({
    document_id: doc.id,
    key: DocumentMetadataKeyCode.IntegrationType as unknown as DocumentMetadataKey,
    value: IntegrationType.Connector,
  });
  await TestHelper.documentMetadata.create({
    document_id: doc.id,
    key: DocumentMetadataKeyCode.ManifestFragmentId as unknown as DocumentMetadataKey,
    value: manifestFragmentId,
  });
  await TestHelper.documentMetadata.create({
    document_id: doc.id,
    key: DocumentMetadataKeyCode.VersionPadded as unknown as DocumentMetadataKey,
    value: ManifestFragmentHelper.validateAndFormatManifestVersion(version),
  });
  if (minimumDeployableVersionPadded) {
    await TestHelper.documentMetadata.create({
      document_id: doc.id,
      key: DocumentMetadataKeyCode.MinimumDeployableVersionPadded as unknown as DocumentMetadataKey,
      value: minimumDeployableVersionPadded,
    });
  }
  return doc;
};

describe('manifestApp', () => {
  beforeEach(() => {
    vi.spyOn(ManifestHelper, 'uploadManifest').mockResolvedValue(undefined);
    vi.spyOn(ManifestHelper, 'deleteManifest').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await TestHelper.objectUseCase.delete({});
    await TestHelper.manifest.delete({});
    await TestHelper.manifestRebuildQueue.delete({});
    await TestHelper.documentMetadata.delete({});
    await TestHelper.document.delete({});
  });

  describe('generateManifest', () => {
    beforeEach(async () => {
      // Create a Processing queue entry so deleteFromRebuildQueue succeeds
      await TestHelper.manifestRebuildQueue.create({
        product: MANIFEST_KEY.platformIdentifier,
        version: MANIFEST_KEY.version,
        type: MANIFEST_KEY.type,
        status: ManifestRebuildQueueStatus.Processing,
      });
    });

    describe('connector fetching and tag selection', () => {
      it('fetches only latest-tagged connectors for a standard version', async () => {
        const expected = await createConnectorDocument([TAG_LATEST]);
        await createConnectorDocument([TAG_LATEST_LTS]);

        await ManifestApp.generateManifest(MANIFEST_KEY);

        const [manifest] = await TestHelper.manifest.loadAll({});
        const links = await TestHelper.manifestDocument.loadAll({
          manifest_id: manifest!.id,
        });
        expect(links).toHaveLength(1);
        expect(links[0]!.document_id).toBe(expected.id);
      });

      it('fetches only latest-lts-tagged connectors for an LTS version', async () => {
        await TestHelper.manifestRebuildQueue.create({
          product: LTS_KEY.platformIdentifier,
          version: LTS_KEY.version,
          type: LTS_KEY.type,
          status: ManifestRebuildQueueStatus.Processing,
        });
        const expected = await createConnectorDocument([TAG_LATEST_LTS]);
        await createConnectorDocument([TAG_LATEST]);

        await ManifestApp.generateManifest(LTS_KEY);

        const [manifest] = await TestHelper.manifest.loadAll({});
        const links = await TestHelper.manifestDocument.loadAll({
          manifest_id: manifest!.id,
        });
        expect(links).toHaveLength(1);
        expect(links[0]!.document_id).toBe(expected.id);
      });

      it('excludes inactive connectors', async () => {
        const doc = await TestHelper.document.create({
          active: false,
          is_decommissioned: false,
          tags: [TAG_LATEST, TAG_DECOUPLING],
        });
        await TestHelper.documentMetadata.create({
          document_id: doc.id,
          key: DocumentMetadataKeyCode.IntegrationType as unknown as DocumentMetadataKey,
          value: IntegrationType.Connector,
        });

        await ManifestApp.generateManifest(MANIFEST_KEY);

        const links = await TestHelper.manifestDocument.loadAll({});
        expect(links).toHaveLength(0);
      });

      it('excludes decommissioned connectors', async () => {
        const doc = await TestHelper.document.create({
          active: true,
          is_decommissioned: true,
          tags: [TAG_LATEST, TAG_DECOUPLING],
        });
        await TestHelper.documentMetadata.create({
          document_id: doc.id,
          key: DocumentMetadataKeyCode.IntegrationType as unknown as DocumentMetadataKey,
          value: IntegrationType.Connector,
        });

        await ManifestApp.generateManifest(MANIFEST_KEY);

        const links = await TestHelper.manifestDocument.loadAll({});
        expect(links).toHaveLength(0);
      });
    });

    describe('fallback resolution for incompatible connectors', () => {
      it('includes compatible connectors as-is without querying for fallbacks', async () => {
        const spy = vi.spyOn(
          DocumentDomain,
          'loadBestCompatibleConnectorsBySlugs'
        );
        const doc1 = await createConnectorWithFragment({
          manifestFragmentId: 'fragment-compatible-1',
          tags: [TAG_LATEST],
        });
        const doc2 = await createConnectorWithFragment({
          manifestFragmentId: 'fragment-compatible-2',
          tags: [TAG_LATEST],
          minimumDeployableVersionPadded: '007.260101.000',
        });

        await ManifestApp.generateManifest(MANIFEST_KEY);

        expect(spy).not.toHaveBeenCalled();
        const links = await TestHelper.manifestDocument.loadAll({});
        expect(links).toHaveLength(2);
        const linkedIds = links.map((l) => l.document_id);
        expect(linkedIds).toContain(doc1.id);
        expect(linkedIds).toContain(doc2.id);
      });

      it('replaces an incompatible connector with the best compatible fallback from the same slug', async () => {
        const slugFallbackSpy = vi.spyOn(
          DocumentDomain,
          'loadBestCompatibleConnectorsBySlugs'
        );
        const byIdHydrationSpy = vi.spyOn(
          DocumentDomain,
          'loadDocumentsWithMetadataByIds'
        );
        await createConnectorWithFragment({
          manifestFragmentId: 'fragment-a',
          slug: 'connector-a',
          tags: [TAG_LATEST],
          minimumDeployableVersionPadded: '007.260601.000', // above MANIFEST_KEY padded version
        });
        const fallback = await createConnectorWithFragment({
          manifestFragmentId: 'fragment-a-legacy',
          slug: 'connector-a',
          version: '7.260101.0',
        });

        await ManifestApp.generateManifest(MANIFEST_KEY);

        expect(byIdHydrationSpy).not.toHaveBeenCalled();
        expect(slugFallbackSpy).toHaveBeenCalledWith(
          ['connector-a'],
          MANIFEST_KEY.version
        );
        const links = await TestHelper.manifestDocument.loadAll({});
        expect(links).toHaveLength(1);
        expect(links[0]!.document_id).toBe(fallback.id);
      });

      it('excludes an incompatible connector when no compatible fallback exists, keeping the rest of the manifest', async () => {
        // Given
        const infoSpy = vi.spyOn(logApp, 'info');
        const incompatible = await createConnectorWithFragment({
          manifestFragmentId: 'fragment-no-fallback',
          slug: 'connector-no-fallback',
          tags: [TAG_LATEST],
          minimumDeployableVersionPadded: '007.260601.000', // above MANIFEST_KEY padded version, no fallback created
        });
        const compatible = await createConnectorDocument([TAG_LATEST]);

        // When
        await ManifestApp.generateManifest(MANIFEST_KEY);

        // Then
        const links = await TestHelper.manifestDocument.loadAll({});
        expect(links).toHaveLength(1);
        expect(links[0]!.document_id).toBe(compatible.id);
        expect(infoSpy).toHaveBeenCalledWith(
          'No compatible fallback found for some connectors, they will be excluded from the manifest',
          expect.objectContaining({
            slugs: ['connector-no-fallback'],
            connectorIds: expect.arrayContaining([incompatible.id]),
          })
        );
      });
    });

    describe('db persistence', () => {
      it('inserts a Manifest row with the correct product, version and type', async () => {
        await createConnectorDocument([TAG_LATEST]);

        await ManifestApp.generateManifest(MANIFEST_KEY);

        const manifests = await TestHelper.manifest.loadAll({});
        expect(manifests).toHaveLength(1);
        expect(manifests[0]).toMatchObject({
          product: PlatformIdentifier.Opencti,
          version: '7.260309.0',
          type: ManifestType.Connector,
        });
      });

      it('sets the manifest name to the full manifest_version string', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));
        await createConnectorDocument([TAG_LATEST]);

        await ManifestApp.generateManifest(MANIFEST_KEY);

        vi.useRealTimers();

        const [manifest] = await TestHelper.manifest.loadAll({});
        expect(manifest!.name).toMatch(
          /^connector-manifest-7\.260309\.0-260701120000-[0-9a-f]{8}$/
        );
        expect(ManifestHelper.uploadManifest).toHaveBeenCalledWith(
          expect.objectContaining({ manifest_version: manifest!.name }),
          ManifestHelper.buildManifestObjectKey(
            MANIFEST_KEY.platformIdentifier,
            MANIFEST_KEY.version,
            manifest!.name
          )
        );
      });

      it('inserts a Manifest_Document link for each matching connector', async () => {
        const doc1 = await createConnectorDocument([TAG_LATEST]);
        const doc2 = await createConnectorDocument([TAG_LATEST]);

        await ManifestApp.generateManifest(MANIFEST_KEY);

        const [manifest] = await TestHelper.manifest.loadAll({});
        const links = await TestHelper.manifestDocument.loadAll({
          manifest_id: manifest!.id,
        });
        expect(links).toHaveLength(2);
        const linkedIds = links.map((l) => l.document_id);
        expect(linkedIds).toContain(doc1.id);
        expect(linkedIds).toContain(doc2.id);
      });

      it('inserts no Manifest_Document links when no connectors match', async () => {
        await ManifestApp.generateManifest(MANIFEST_KEY);

        const links = await TestHelper.manifestDocument.loadAll({});
        expect(links).toHaveLength(0);
      });

      it('deletes the matching queue entry but leaves others untouched', async () => {
        await TestHelper.manifestRebuildQueue.create({
          product: PlatformIdentifier.Openaev,
          version: '7.260309.0',
          type: ManifestType.Connector,
          status: ManifestRebuildQueueStatus.Processing,
        });
        await createConnectorDocument([TAG_LATEST]);

        await ManifestApp.generateManifest(MANIFEST_KEY);

        const remaining = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(remaining).toHaveLength(1);
        expect(remaining[0]!.product).toBe(PlatformIdentifier.Openaev);
      });

      it('publishes nothing when its claim expired and a replacement job completed the request', async () => {
        // Given worker A whose claim expired, and worker B that recovered the
        // request and published the rebuild
        await TestHelper.manifestRebuildQueue.delete({});
        await createConnectorDocument([TAG_LATEST]);
        const claimA = randomUUID();
        await TestHelper.manifestRebuildQueue.create({
          product: MANIFEST_KEY.platformIdentifier,
          version: MANIFEST_KEY.version,
          type: MANIFEST_KEY.type,
          status: ManifestRebuildQueueStatus.Processing,
          claimed_at: new Date(Date.now() - 31 * 60 * 1000),
          claim_id: claimA,
        });
        await ManifestDomain.recoverStuckProcessingEntries();
        const claimB = randomUUID();
        await ManifestDomain.loadPendingManifestsForProcessing(
          MANIFEST_KEY,
          claimB
        );
        await ManifestApp.generateManifest(MANIFEST_KEY, claimB);

        // When worker A finishes last
        const lateBuild = ManifestApp.generateManifest(MANIFEST_KEY, claimA);

        // Then its build is rolled back and only the replacement is served
        await expect(lateBuild).rejects.toThrow(
          UnknownErrorCode.ManifestRebuildClaimLost
        );
        expect(await TestHelper.manifest.loadAll({})).toHaveLength(1);
        expect(await TestHelper.manifestRebuildQueue.loadAll({})).toEqual([]);
      });

      it('keeps serving the replacement file when a late build of the same second is rolled back', async () => {
        // Given worker B that recovered the request from worker A, and a
        // storage that keeps one file per key
        await TestHelper.manifestRebuildQueue.delete({});
        await createConnectorWithFragment({
          manifestFragmentId: 'fragment-current',
          tags: [TAG_LATEST],
        });
        const storedFiles = new Map<string, ManifestOutput>();
        vi.mocked(ManifestHelper.uploadManifest).mockImplementation(
          async (manifest, fileName) => {
            storedFiles.set(fileName, manifest);
          }
        );
        vi.mocked(ManifestHelper.deleteManifest).mockImplementation(
          async (fileName) => {
            storedFiles.delete(fileName);
          }
        );
        const claimA = randomUUID();
        await TestHelper.manifestRebuildQueue.create({
          product: MANIFEST_KEY.platformIdentifier,
          version: MANIFEST_KEY.version,
          type: MANIFEST_KEY.type,
          status: ManifestRebuildQueueStatus.Processing,
          claimed_at: new Date(Date.now() - 31 * 60 * 1000),
          claim_id: claimA,
        });
        await ManifestDomain.recoverStuckProcessingEntries();
        const claimB = randomUUID();
        await ManifestDomain.loadPendingManifestsForProcessing(
          MANIFEST_KEY,
          claimB
        );

        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));
        try {
          await ManifestApp.generateManifest(MANIFEST_KEY, claimB);

          // When worker A, which read other contracts, uploads in the same second
          await createConnectorWithFragment({
            manifestFragmentId: 'fragment-stale',
            tags: [TAG_LATEST],
          });
          await expect(
            ManifestApp.generateManifest(MANIFEST_KEY, claimA)
          ).rejects.toThrow(UnknownErrorCode.ManifestRebuildClaimLost);
        } finally {
          vi.useRealTimers();
        }

        // Then the served manifest file still holds the replacement's contracts
        const [served] = await TestHelper.manifest.loadAll({});
        const servedFile = storedFiles.get(
          ManifestHelper.buildManifestObjectKey(
            MANIFEST_KEY.platformIdentifier,
            MANIFEST_KEY.version,
            served!.name
          )
        );
        expect([...storedFiles.keys()]).toEqual([
          ManifestHelper.buildManifestObjectKey(
            MANIFEST_KEY.platformIdentifier,
            MANIFEST_KEY.version,
            served!.name
          ),
        ]);
        expect(servedFile?.contracts.map((contract) => contract.id)).toEqual([
          'fragment-current',
        ]);
      });

      it('keeps the file and returns the manifest when its save is committed but reports an error', async () => {
        // Given a save whose commit is durable although it reports an error
        await createConnectorDocument([TAG_LATEST]);
        vi.spyOn(
          ManifestDomain,
          'deleteFromRebuildQueue'
        ).mockRejectedValueOnce(
          new Error('Connection terminated unexpectedly')
        );
        vi.spyOn(ManifestDomain, 'getManifestByName').mockImplementationOnce(
          async (_product, _version, _type, name) => ({
            name,
            created_at: new Date(),
          })
        );

        // When
        const manifest = await ManifestApp.generateManifest(MANIFEST_KEY);

        // Then
        expect(manifest).not.toBeNull();
        expect(ManifestHelper.deleteManifest).not.toHaveBeenCalled();
      });

      it('keeps the file when it cannot read whether a failed save was committed', async () => {
        // Given a failed save, and a database that cannot be read afterwards
        await createConnectorDocument([TAG_LATEST]);
        vi.spyOn(
          ManifestDomain,
          'deleteFromRebuildQueue'
        ).mockRejectedValueOnce(
          new Error('Connection terminated unexpectedly')
        );
        vi.spyOn(ManifestDomain, 'getManifestByName').mockRejectedValueOnce(
          new Error('Connection refused')
        );

        // When
        const generation = ManifestApp.generateManifest(MANIFEST_KEY);

        // Then
        await expect(generation).rejects.toThrow(
          'Connection terminated unexpectedly'
        );
        expect(ManifestHelper.deleteManifest).not.toHaveBeenCalled();
      });

      it('deletes the file of a save that was rolled back', async () => {
        // Given
        await createConnectorDocument([TAG_LATEST]);
        vi.spyOn(
          ManifestDomain,
          'deleteFromRebuildQueue'
        ).mockRejectedValueOnce(
          new Error('Connection terminated unexpectedly')
        );

        // When
        const generation = ManifestApp.generateManifest(MANIFEST_KEY);

        // Then
        await expect(generation).rejects.toThrow(
          'Connection terminated unexpectedly'
        );
        expect(await TestHelper.manifest.loadAll({})).toEqual([]);
        expect(ManifestHelper.deleteManifest).toHaveBeenCalledTimes(1);
      });

      it('logs an error and still persists the manifest when no processing queue entry exists for the key', async () => {
        // Remove the Processing queue entry created in beforeEach so
        // deleteFromRebuildQueue really deletes 0 rows (no mocking).
        await TestHelper.manifestRebuildQueue.delete({});
        await createConnectorDocument([TAG_LATEST]);
        const logSpy = vi.spyOn(logApp, 'error');

        await ManifestApp.generateManifest(MANIFEST_KEY);

        expect(logSpy).toHaveBeenCalledWith(
          'No processing queue entry found to delete',
          { key: MANIFEST_KEY }
        );
        const manifests = await TestHelper.manifest.loadAll({});
        expect(manifests).toHaveLength(1);
      });
    });

    describe('minio upload ordering', () => {
      it('calls uploadManifest exactly once', async () => {
        await createConnectorDocument([TAG_LATEST]);
        await ManifestApp.generateManifest(MANIFEST_KEY);
        expect(ManifestHelper.uploadManifest).toHaveBeenCalledOnce();
      });

      it('writes nothing to the DB when uploadManifest throws', async () => {
        vi.mocked(ManifestHelper.uploadManifest).mockRejectedValueOnce(
          new Error('MinIO unavailable')
        );
        await createConnectorDocument([TAG_LATEST]);

        await expect(
          ManifestApp.generateManifest(MANIFEST_KEY)
        ).rejects.toThrow('MinIO unavailable');

        const manifests = await TestHelper.manifest.loadAll({});
        expect(manifests).toHaveLength(0);
      });
    });

    describe('return value', () => {
      it('returns a ManifestOutput with the correct product_version and contracts', async () => {
        await createConnectorDocument([TAG_LATEST]);

        const result = await ManifestApp.generateManifest(MANIFEST_KEY);

        expect(result).not.toBeNull();
        expect(result!.product_version).toBe('7.260309.0');
        expect(result!.contracts).toHaveLength(1);
      });

      it('populates use_cases from linked use cases for each connector', async () => {
        const doc = await createConnectorDocument([TAG_LATEST]);
        await TestHelper.objectUseCase.insert([
          {
            object_id: doc.id as unknown as ObjectUseCaseObjectId,
            use_case_id: TEST_USE_CASES.AUTOMATION.ID,
          },
          {
            object_id: doc.id as unknown as ObjectUseCaseObjectId,
            use_case_id: TEST_USE_CASES.INTEGRATION.ID,
          },
        ]);

        const result = await ManifestApp.generateManifest(MANIFEST_KEY);

        expect(result).not.toBeNull();
        expect(result!.contracts).toHaveLength(1);
        expect(result!.contracts[0]!.use_cases).toHaveLength(2);
        expect(result!.contracts[0]!.use_cases).toContain(
          TEST_USE_CASES.AUTOMATION.NAME
        );
        expect(result!.contracts[0]!.use_cases).toContain(
          TEST_USE_CASES.INTEGRATION.NAME
        );
      });

      it('sets use_cases to empty array when a connector has no linked use cases', async () => {
        await createConnectorDocument([TAG_LATEST]);

        const result = await ManifestApp.generateManifest(MANIFEST_KEY);

        expect(result).not.toBeNull();
        expect(result!.contracts).toHaveLength(1);
        expect(result!.contracts[0]!.use_cases).toEqual([]);
      });

      it('populates logo as a base64 data URI when the connector has a logo', async () => {
        const doc = await createConnectorDocument([TAG_LATEST]);
        await DocumentChildrenDomain.createImageDocuments(
          doc.id,
          INTEGRATION_SERVICE_INSTANCE_ID,
          [
            {
              fileName: 'logo.png',
              minioName: 'minio-logo-name',
              mimeType: 'image/png',
            },
          ],
          DocumentImageType.Logo
        );
        vi.spyOn(MinIOClient, 'downloadFile').mockResolvedValue(
          Readable.from([
            Buffer.from('fake-image-bytes'),
          ]) as unknown as Awaited<ReturnType<typeof MinIOClient.downloadFile>>
        );

        const result = await ManifestApp.generateManifest(MANIFEST_KEY);

        expect(result).not.toBeNull();
        expect(result!.contracts).toHaveLength(1);
        expect(result!.contracts[0]!.logo).toBe(
          `data:image/png;base64,${Buffer.from('fake-image-bytes').toString('base64')}`
        );
      });

      it('sets logo to null and continues when MinIO download fails for one connector', async () => {
        vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
        const doc = await createConnectorDocument([TAG_LATEST]);
        await DocumentChildrenDomain.createImageDocuments(
          doc.id,
          INTEGRATION_SERVICE_INSTANCE_ID,
          [
            {
              fileName: 'logo.png',
              minioName: 'minio-logo-name',
              mimeType: 'image/png',
            },
          ],
          DocumentImageType.Logo
        );
        vi.spyOn(MinIOClient, 'downloadFile').mockRejectedValue(
          new Error('S3 unavailable')
        );

        const result = await ManifestApp.generateManifest(MANIFEST_KEY);

        expect(result).not.toBeNull();
        expect(result!.contracts).toHaveLength(1);
        expect(result!.contracts[0]!.logo).toBeNull();
      });
    });
  });

  describe('requestManifestGeneration', () => {
    it('should queue the manifest and enqueue an immediate rebuild when the version is valid', async () => {
      const insertIfNotPendingSpy = vi
        .spyOn(ManifestDomain, 'insertIfNotPending')
        .mockResolvedValue(undefined);
      const enqueueImmediateRebuildSpy = vi
        .spyOn(ManifestHelper, 'enqueueImmediateRebuild')
        .mockResolvedValue(undefined);

      await ManifestApp.requestManifestGeneration({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
      });

      const expectedKey = {
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
      };
      expect(insertIfNotPendingSpy).toHaveBeenCalledWith(expectedKey);
      expect(enqueueImmediateRebuildSpy).toHaveBeenCalledWith(expectedKey);
    });

    it.each`
      version
      ${'not-a-version'}
      ${'6.4'}
      ${''}
      ${'7.20260703.0'}
      ${'7.260309.0-lts'}
    `(
      'should throw and not queue nor enqueue when the version "$version" is invalid',
      async ({ version }: { version: string }) => {
        const insertIfNotPendingSpy = vi
          .spyOn(ManifestDomain, 'insertIfNotPending')
          .mockResolvedValue(undefined);
        const enqueueImmediateRebuildSpy = vi
          .spyOn(ManifestHelper, 'enqueueImmediateRebuild')
          .mockResolvedValue(undefined);

        await expect(
          ManifestApp.requestManifestGeneration({
            product: PlatformIdentifier.Opencti,
            version,
            type: ManifestType.Connector,
          })
        ).rejects.toThrow(BadRequestErrorCode.InvalidPlatformVersion);

        expect(insertIfNotPendingSpy).not.toHaveBeenCalled();
        expect(enqueueImmediateRebuildSpy).not.toHaveBeenCalled();
      }
    );
  });

  describe('processManifestQueue', () => {
    beforeEach(() => {
      vi.spyOn(ManifestApp, 'generateManifest').mockResolvedValue({
        id: 'catalog-id',
        name: 'OpenCTI Connectors contracts',
        description: '',
        manifest_schema_version: '1',
        manifest_version: 'connector-manifest-6.4.0-test',
        product_version: '6.4.0',
        contracts: [],
      });
    });

    it('does not call generateManifest when the queue is empty', async () => {
      await ManifestApp.processManifestQueue();
      expect(ManifestApp.generateManifest).not.toHaveBeenCalled();
    });

    it('calls generateManifest for each pending row with the correct key', async () => {
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

      await ManifestApp.processManifestQueue();

      expect(ManifestApp.generateManifest).toHaveBeenCalledTimes(2);
      expect(ManifestApp.generateManifest).toHaveBeenCalledWith(
        {
          platformIdentifier: PlatformIdentifier.Opencti,
          version: '6.4.0',
          type: ManifestType.Connector,
        },
        expect.any(String)
      );
      expect(ManifestApp.generateManifest).toHaveBeenCalledWith(
        {
          platformIdentifier: PlatformIdentifier.Openaev,
          version: '1.0.0',
          type: ManifestType.Connector,
        },
        expect.any(String)
      );
    });

    it('only processes the matching row when a filter key is passed', async () => {
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: MANIFEST_KEY.version,
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Openaev,
        version: MANIFEST_KEY.version,
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });

      await ManifestApp.processManifestQueue(MANIFEST_KEY);

      expect(ManifestApp.generateManifest).toHaveBeenCalledOnce();
      expect(ManifestApp.generateManifest).toHaveBeenCalledWith(
        MANIFEST_KEY,
        expect.any(String)
      );
    });

    it('returns a failed rebuild to pending so that the next sweep resumes it', async () => {
      // Given a request queued two hours ago whose generation fails
      vi.mocked(ManifestApp.generateManifest).mockRejectedValueOnce(
        new Error('storage unavailable')
      );
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        status: ManifestRebuildQueueStatus.Pending,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
      const enqueueImmediateRebuildSpy = vi
        .spyOn(ManifestHelper, 'enqueueImmediateRebuild')
        .mockResolvedValue(undefined);

      // When the rebuild fails, then the idle sweep runs
      await ManifestApp.processManifestQueue();
      const rows = await TestHelper.manifestRebuildQueue.loadAll({});
      const resumed = await ManifestApp.resumePendingRebuilds({
        createdBefore: new Date(Date.now() - 60 * 60 * 1000),
      });

      // Then the request is pending again and sent once more
      expect(rows).toEqual([
        expect.objectContaining({
          version: '7.261002.0',
          status: ManifestRebuildQueueStatus.Pending,
        }),
      ]);
      expect(resumed).toEqual({ resumed: 1, failed: 0 });
      expect(enqueueImmediateRebuildSpy).toHaveBeenCalledExactlyOnceWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        type: ManifestType.Connector,
      });
    });

    it('drops a failed rebuild when a pending request already covers its key', async () => {
      // Given a failing rebuild and a newer pending request for the same key
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        status: ManifestRebuildQueueStatus.Pending,
      });
      vi.mocked(ManifestApp.generateManifest).mockImplementationOnce(
        async () => {
          await TestHelper.manifestRebuildQueue.create({
            product: PlatformIdentifier.Opencti,
            version: '7.261002.0',
            status: ManifestRebuildQueueStatus.Pending,
          });
          throw new Error('storage unavailable');
        }
      );

      // When the rebuild fails
      await ManifestApp.processManifestQueue();

      // Then only the pending request remains
      expect(await TestHelper.manifestRebuildQueue.loadAll({})).toEqual([
        expect.objectContaining({
          status: ManifestRebuildQueueStatus.Pending,
        }),
      ]);
    });

    it('removes a request that has nothing to publish', async () => {
      // Given a request whose generation finds no connector
      vi.mocked(ManifestApp.generateManifest).mockResolvedValueOnce(null);
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        status: ManifestRebuildQueueStatus.Pending,
      });

      // When the queue is processed
      await ManifestApp.processManifestQueue();

      // Then the request leaves the queue instead of staying in processing
      expect(await TestHelper.manifestRebuildQueue.loadAll({})).toEqual([]);
    });

    it("ignores rows with status 'processing'", async () => {
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Processing,
      });

      await ManifestApp.processManifestQueue();

      expect(ManifestApp.generateManifest).not.toHaveBeenCalled();
    });
  });

  describe('resumePendingRebuilds', () => {
    it('sends one rebuild job per pending key and skips keys being processed', async () => {
      // Given
      const enqueueImmediateRebuildSpy = vi
        .spyOn(ManifestHelper, 'enqueueImmediateRebuild')
        .mockResolvedValue(undefined);
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        status: ManifestRebuildQueueStatus.Pending,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.261001.0',
        status: ManifestRebuildQueueStatus.Processing,
      });

      // When
      const resumed = await ManifestApp.resumePendingRebuilds();

      // Then
      expect(resumed).toEqual({ resumed: 1, failed: 0 });
      expect(enqueueImmediateRebuildSpy).toHaveBeenCalledExactlyOnceWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        type: ManifestType.Connector,
      });
    });

    it('keeps the fresh claim of a worker on an hour-old request while another worker runs', async () => {
      // Given an hour-old request that worker A has just claimed
      const generateManifestSpy = vi
        .spyOn(ManifestApp, 'generateManifest')
        .mockResolvedValue(null);
      const key = {
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        type: ManifestType.Connector,
      };
      await TestHelper.manifestRebuildQueue.create({
        product: key.platformIdentifier,
        version: key.version,
        status: ManifestRebuildQueueStatus.Pending,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
      const claimA = randomUUID();
      await ManifestDomain.loadPendingManifestsForProcessing(undefined, claimA);

      // When worker B processes the queue and completes with its own claim
      await ManifestApp.processManifestQueue();
      const deletedByB = await ManifestDomain.deleteFromRebuildQueue(
        key,
        randomUUID()
      );

      // Then the claim of A is neither released nor completed by B
      expect(generateManifestSpy).not.toHaveBeenCalled();
      expect(deletedByB).toBe(0);
      expect(await TestHelper.manifestRebuildQueue.loadAll({})).toEqual([
        expect.objectContaining({
          status: ManifestRebuildQueueStatus.Processing,
          claim_id: claimA,
        }),
      ]);
      expect(await ManifestDomain.deleteFromRebuildQueue(key, claimA)).toBe(1);
    });

    it('recovers the expired claim of a stopped process on an idle installation', async () => {
      // Given a rebuild claimed 31 minutes ago by a process that stopped
      const enqueueImmediateRebuildSpy = vi
        .spyOn(ManifestHelper, 'enqueueImmediateRebuild')
        .mockResolvedValue(undefined);
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        status: ManifestRebuildQueueStatus.Processing,
        claimed_at: new Date(Date.now() - 31 * 60 * 1000),
        claim_id: randomUUID(),
      });

      // When the startup or periodic sweep runs, with no other job
      const resumed = await ManifestApp.resumePendingRebuilds();

      // Then the request is pending again and sent once more
      expect(resumed).toEqual({ resumed: 1, failed: 0 });
      expect(await TestHelper.manifestRebuildQueue.loadAll({})).toEqual([
        expect.objectContaining({
          status: ManifestRebuildQueueStatus.Pending,
          claim_id: null,
          claimed_at: null,
        }),
      ]);
      expect(enqueueImmediateRebuildSpy).toHaveBeenCalledExactlyOnceWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        type: ManifestType.Connector,
      });
    });

    it('sends nothing when no rebuild is pending', async () => {
      // Given
      const enqueueImmediateRebuildSpy = vi
        .spyOn(ManifestHelper, 'enqueueImmediateRebuild')
        .mockResolvedValue(undefined);

      // When
      const resumed = await ManifestApp.resumePendingRebuilds();

      // Then
      expect(resumed).toEqual({ resumed: 0, failed: 0 });
      expect(enqueueImmediateRebuildSpy).not.toHaveBeenCalled();
    });

    it('attempts every key when an enqueue fails and keeps the failed key pending', async () => {
      // Given
      const enqueueImmediateRebuildSpy = vi
        .spyOn(ManifestHelper, 'enqueueImmediateRebuild')
        .mockRejectedValueOnce(new Error('queue unavailable'))
        .mockResolvedValue(undefined);
      for (const version of ['7.261001.0', '7.261002.0']) {
        await TestHelper.manifestRebuildQueue.create({
          product: PlatformIdentifier.Opencti,
          version,
          status: ManifestRebuildQueueStatus.Pending,
        });
      }

      // When
      const resumed = await ManifestApp.resumePendingRebuilds();

      // Then
      expect(resumed).toEqual({ resumed: 1, failed: 1 });
      expect(enqueueImmediateRebuildSpy).toHaveBeenCalledTimes(2);
      expect(
        await TestHelper.manifestRebuildQueue.loadAll({
          status: ManifestRebuildQueueStatus.Pending,
        })
      ).toHaveLength(2);
    });

    it('only resumes the keys pending since before the given date', async () => {
      // Given
      const enqueueImmediateRebuildSpy = vi
        .spyOn(ManifestHelper, 'enqueueImmediateRebuild')
        .mockResolvedValue(undefined);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.261001.0',
        status: ManifestRebuildQueueStatus.Pending,
        created_at: twoHoursAgo,
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.261002.0',
        status: ManifestRebuildQueueStatus.Pending,
      });

      // When
      const resumed = await ManifestApp.resumePendingRebuilds({
        createdBefore: new Date(Date.now() - 60 * 60 * 1000),
      });

      // Then
      expect(resumed).toEqual({ resumed: 1, failed: 0 });
      expect(enqueueImmediateRebuildSpy).toHaveBeenCalledExactlyOnceWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.261001.0',
        type: ManifestType.Connector,
      });
    });
  });
});
