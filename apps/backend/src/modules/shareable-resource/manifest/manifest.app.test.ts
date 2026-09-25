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
import { BadRequestErrorCode } from '../../../utils/error/error.code';
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
  minimumDeployableVersion,
  tags = [],
  version = '7.260309.0',
  active = true,
  isDecommissioned = false,
}: {
  manifestFragmentId: string;
  slug?: string;
  minimumDeployableVersion?: string;
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
    key: DocumentMetadataKeyCode.VersionPadded as unknown as DocumentMetadataKey,
    value: ManifestFragmentHelper.validateAndFormatManifestVersion(version),
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
  if (minimumDeployableVersion) {
    await TestHelper.documentMetadata.create({
      document_id: doc.id,
      key: DocumentMetadataKeyCode.MinimumDeployableVersionPadded as unknown as DocumentMetadataKey,
      value:
        ManifestFragmentHelper.validateAndFormatManifestVersion(
          minimumDeployableVersion
        ),
    });
  }
  return doc;
};

describe('manifestApp', () => {
  beforeEach(() => {
    vi.spyOn(ManifestHelper, 'uploadManifest').mockResolvedValue(undefined);
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
          minimumDeployableVersion: '7.260101.0',
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
          minimumDeployableVersion: '7.260601.0', // above MANIFEST_KEY version
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
          minimumDeployableVersion: '7.260601.0', // above MANIFEST_KEY version, no fallback created
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
        expect(manifest!.name).toBe(
          'connector-manifest-7.260309.0-260701120000'
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
      expect(ManifestApp.generateManifest).toHaveBeenCalledWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: ManifestType.Connector,
      });
      expect(ManifestApp.generateManifest).toHaveBeenCalledWith({
        platformIdentifier: PlatformIdentifier.Openaev,
        version: '1.0.0',
        type: ManifestType.Connector,
      });
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
      expect(ManifestApp.generateManifest).toHaveBeenCalledWith(MANIFEST_KEY);
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
});
