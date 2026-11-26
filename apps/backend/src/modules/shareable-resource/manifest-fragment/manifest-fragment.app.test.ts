import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_META_DESCRIPTIONS } from '../../../../tests/tests.const';
import {
  DocumentMetadataKeyCode,
  ManifestType,
  PlatformIdentifier,
  PortalCapability,
  type ManifestFragmentInput,
  type MutationIngestManifestFragmentsArgs,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import type { DocumentId } from '../../../model/kanel/public/Document';
import { SYSTEM_USER_CONTEXT } from '../../../portal.const';
import { minioInit } from '../../../server/initialize';
import * as FeatureFlagUtil from '../../../utils/feature-flag.util';
import { DocumentApp } from '../../document/document.app';
import { ManifestRebuildQueueStatus } from '../manifest/manifest.consts';
import { ManifestHelper } from '../manifest/manifest.helper';
import { INTEGRATION_SERVICE_INSTANCE_ID } from '../opencti/integration/integration.model';
import { ManifestFragmentApp } from './manifest-fragment.app';
import { TAG_LATEST } from './manifest-fragment.helper';

describe('manifestFragmentApp', () => {
  beforeAll(async () => {
    await minioInit();
  });

  let createdDocumentIds: string[] = [];
  const manifestIngestionUser = {
    ...SYSTEM_USER_CONTEXT.user,
    capabilities: [
      {
        id: 'manifest-ingestions-capability' as never,
        name: PortalCapability.ManageManifestIngestions,
      },
    ],
  };

  beforeEach(() => {
    vi.spyOn(FeatureFlagUtil, 'isFeatureEnabled').mockReturnValue(true);
  });

  afterEach(async () => {
    if (createdDocumentIds.length > 0) {
      for (const documentId of createdDocumentIds) {
        await TestHelper.documentMetadata.delete({
          document_id: documentId as DocumentId,
        });
        await TestHelper.document.delete({ id: documentId as DocumentId });
      }
      createdDocumentIds = [];
    }
    await TestHelper.manifest.delete({});
    await TestHelper.manifestRebuildQueue.delete({});
  });

  const buildManifestFragment = ({
    id = 'abc123',
    slug = 'misp',
    minVersion = '7.260507.0',
    version = '7.260309.0',
  }: {
    id?: string;
    slug?: string;
    minVersion?: string;
    version?: string;
  } = {}): ManifestFragmentInput => ({
    id,
    title: 'MISP',
    slug,
    description:
      'The MISP connector imports threat intelligence from MISP instances into OpenCTI.',
    short_description:
      'Import threat intelligence events, indicators, and observables from MISP instances.',
    logo: 'SGVsbG8sIFdvcmxkIQ==',
    use_cases: ['Open Source Threat Intel'],
    verified: true,
    last_verified_date: '2025-01-01',
    subscription_link: 'https://www.misp-project.org',
    source_code:
      'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/misp',
    manager_supported: true,
    min_version: minVersion,
    version,
    image_name: 'opencti/connector-misp',
    image_type: 'EXTERNAL_IMPORT',
    platform: 'OpenCTI',
    integration_type: ManifestType.Connector,
    additional_properties: {},
    config_schema: {},
    solution_categories: ['Threat Intelligence'],
  });

  const buildArgs = (
    params: Parameters<typeof buildManifestFragment>[0] = {}
  ): MutationIngestManifestFragmentsArgs => ({
    manifestFragments: [buildManifestFragment(params)],
  });

  describe('security', () => {
    beforeEach(() => {
      requestContext.set({ user: SYSTEM_USER_CONTEXT.user });
    });

    it('rejects the call when the user lacks ManageManifestIngestions capability', async () => {
      const args = buildArgs({ slug: 'misp-unauthorized' });

      await expect(
        ManifestFragmentApp.ingestManifestFragments(args)
      ).rejects.toThrow();

      const createdDocument = await TestHelper.document.load({
        slug: 'misp-unauthorized',
      });
      expect(createdDocument).toBeUndefined();
    });
  });

  describe('while decoupled connectors are disabled', () => {
    beforeEach(() => {
      requestContext.set({ user: manifestIngestionUser });
      vi.spyOn(FeatureFlagUtil, 'isFeatureEnabled').mockReturnValue(false);
      vi.spyOn(ManifestHelper, 'scheduleDebouncedRebuild').mockResolvedValue(
        undefined
      );
    });

    it('should store nothing and schedule no rebuild', async () => {
      // Given
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Opencti,
        version: '7.260507.0',
        version_padded: '007.260507.000',
      });
      const args = buildArgs({ slug: 'misp-disabled' });

      // When
      await ManifestFragmentApp.ingestManifestFragments(args);

      // Then
      const createdDocument = await TestHelper.document.load({
        slug: 'misp-disabled',
      });
      expect(createdDocument).toBeUndefined();
      const queuedRows = await TestHelper.manifestRebuildQueue.loadAll({});
      expect(queuedRows).toHaveLength(0);
      expect(ManifestHelper.scheduleDebouncedRebuild).not.toHaveBeenCalled();
    });
  });

  describe('orchestration', () => {
    beforeEach(() => {
      requestContext.set({ user: manifestIngestionUser });
      // These DB-integration tests only assert on ManifestRebuildQueue rows;
      // the pg-boss debounce trigger itself is covered in manifest.helper.test.ts.
      vi.spyOn(ManifestHelper, 'scheduleDebouncedRebuild').mockResolvedValue(
        undefined
      );
    });

    it('enqueues manifests whose version is at or above the ingested fragment min_version', async () => {
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Opencti,
        version: '7.260507.0',
        version_padded: '007.260507.000',
      });
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Opencti,
        version: '7.260600.0',
        version_padded: '007.260600.000',
      });

      const args = buildArgs({
        slug: 'misp-enqueue',
        minVersion: '7.260507.0',
      });

      await ManifestFragmentApp.ingestManifestFragments(args);

      const createdDocument = await TestHelper.document.load({
        slug: 'misp-enqueue',
      });
      createdDocumentIds.push(createdDocument!.id);

      const queuedRows = await TestHelper.manifestRebuildQueue.loadAll({});
      expect(queuedRows).toHaveLength(2);
      expect(
        queuedRows.every(
          (row) => row.status === ManifestRebuildQueueStatus.Pending
        )
      ).toBe(true);
      expect(queuedRows.map((row) => row.version).sort()).toEqual([
        '7.260507.0',
        '7.260600.0',
      ]);

      expect(ManifestHelper.scheduleDebouncedRebuild).toHaveBeenCalledTimes(2);
      expect(ManifestHelper.scheduleDebouncedRebuild).toHaveBeenCalledWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.260507.0',
        type: ManifestType.Connector,
      });
      expect(ManifestHelper.scheduleDebouncedRebuild).toHaveBeenCalledWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.260600.0',
        type: ManifestType.Connector,
      });
    });

    it.each`
      description                                 | seedManifest | slug
      ${'no manifest has been generated yet'}     | ${false}     | ${'misp-no-manifests'}
      ${'the only manifest is below min_version'} | ${true}      | ${'misp-below-threshold'}
    `(
      'does not enqueue anything when $description',
      async ({
        seedManifest,
        slug,
      }: {
        seedManifest: boolean;
        slug: string;
      }) => {
        if (seedManifest) {
          await TestHelper.manifest.create({
            product: PlatformIdentifier.Opencti,
            version: '7.260500.0',
            version_padded: '007.260500.000',
          });
        }

        const args = buildArgs({ slug, minVersion: '7.260507.0' });

        await ManifestFragmentApp.ingestManifestFragments(args);

        const createdDocument = await TestHelper.document.load({ slug });
        createdDocumentIds.push(createdDocument!.id);

        const queuedRows = await TestHelper.manifestRebuildQueue.loadAll({});
        expect(queuedRows).toHaveLength(0);
        expect(ManifestHelper.scheduleDebouncedRebuild).not.toHaveBeenCalled();
      }
    );

    it('does not duplicate an already-pending rebuild queue entry', async () => {
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Opencti,
        version: '7.260507.0',
        version_padded: '007.260507.000',
      });
      await TestHelper.manifestRebuildQueue.create({
        product: PlatformIdentifier.Opencti,
        version: '7.260507.0',
        type: ManifestType.Connector,
        status: ManifestRebuildQueueStatus.Pending,
      });

      const args = buildArgs({
        slug: 'misp-dedup',
        minVersion: '7.260507.0',
      });

      await ManifestFragmentApp.ingestManifestFragments(args);

      const createdDocument = await TestHelper.document.load({
        slug: 'misp-dedup',
      });
      createdDocumentIds.push(createdDocument!.id);

      const queuedRows = await TestHelper.manifestRebuildQueue.loadAll({});
      expect(queuedRows).toHaveLength(1);

      // Still debounce-scheduled even though the DB row already existed:
      // the DB row is the durable "needs rebuild" marker, the pg-boss job
      // is what actually triggers/refreshes the debounce timer.
      expect(ManifestHelper.scheduleDebouncedRebuild).toHaveBeenCalledTimes(1);
      expect(ManifestHelper.scheduleDebouncedRebuild).toHaveBeenCalledWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.260507.0',
        type: ManifestType.Connector,
      });
    });

    it('only enqueues LTS manifests when the ingested fragment is an LTS version', async () => {
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Opencti,
        version: '7.260507.0-lts.1',
        version_padded: '007.260507.000.LTS.001',
      });
      await TestHelper.manifest.create({
        product: PlatformIdentifier.Opencti,
        version: '7.260600.0',
        version_padded: '007.260600.000',
      });

      const args = buildArgs({
        slug: 'misp-lts-enqueue',
        minVersion: '7.260507.0',
        version: '7.260309.0-lts.5',
      });

      await ManifestFragmentApp.ingestManifestFragments(args);

      const createdDocument = await TestHelper.document.load({
        slug: 'misp-lts-enqueue',
      });
      createdDocumentIds.push(createdDocument!.id);

      const queuedRows = await TestHelper.manifestRebuildQueue.loadAll({});
      expect(queuedRows).toHaveLength(1);
      expect(queuedRows[0]!.version).toBe('7.260507.0-lts.1');

      expect(ManifestHelper.scheduleDebouncedRebuild).toHaveBeenCalledTimes(1);
      expect(ManifestHelper.scheduleDebouncedRebuild).toHaveBeenCalledWith({
        platformIdentifier: PlatformIdentifier.Opencti,
        version: '7.260507.0-lts.1',
        type: ManifestType.Connector,
      });
    });

    it('rejects the call when the batch mixes LTS and non-LTS fragments', async () => {
      const args: MutationIngestManifestFragmentsArgs = {
        manifestFragments: [
          buildManifestFragment({ slug: 'misp-mixed-lts' }),
          buildManifestFragment({
            slug: 'misp-mixed-lts-second',
            version: '7.260309.0-lts.5',
          }),
        ],
      };

      await expect(
        ManifestFragmentApp.ingestManifestFragments(args)
      ).rejects.toThrow();

      const createdDocument = await TestHelper.document.load({
        slug: 'misp-mixed-lts',
      });
      expect(createdDocument).toBeUndefined();
    });
  });

  describe('meta description carry-forward', () => {
    // What the connector form sends on an update: the connector metadata it edits.
    const connectorFormMetadata = (fragment: ManifestFragmentInput) => [
      { key: DocumentMetadataKeyCode.IntegrationType, value: 'connector' },
      { key: DocumentMetadataKeyCode.ProductVersion, value: fragment.version },
      {
        key: DocumentMetadataKeyCode.ContainerImage,
        value: fragment.image_name,
      },
      {
        key: DocumentMetadataKeyCode.Verified,
        value: String(fragment.verified),
      },
      { key: DocumentMetadataKeyCode.SourceCode, value: fragment.source_code },
      {
        key: DocumentMetadataKeyCode.ManagerSupported,
        value: String(fragment.manager_supported),
      },
      { key: DocumentMetadataKeyCode.PlaybookSupported, value: 'false' },
    ];

    beforeEach(() => {
      requestContext.set({ user: manifestIngestionUser });
      vi.spyOn(ManifestHelper, 'scheduleDebouncedRebuild').mockResolvedValue(
        undefined
      );
    });

    it('creates a brand-new connector family without meta description', async () => {
      // Given
      const slug = 'misp-meta-description-new-family';

      // When
      await ManifestFragmentApp.ingestManifestFragments(buildArgs({ slug }));

      // Then
      const createdDocument = await TestHelper.document.load({ slug });
      createdDocumentIds.push(createdDocument!.id);
      expect(createdDocument).toMatchObject({
        slug,
        meta_description: null,
      });
    });

    it('keeps the meta description an admin entered when a newer version becomes the latest', async () => {
      // Given a connector whose meta description an admin entered in the connector form
      const slug = 'misp-meta-description-carried';
      const firstFragment = buildManifestFragment({
        slug,
        version: '7.260308.0',
      });
      await ManifestFragmentApp.ingestManifestFragments({
        manifestFragments: [firstFragment],
      });
      const firstDocument = await TestHelper.document.load({
        slug,
        version: firstFragment.version,
      });
      createdDocumentIds.push(firstDocument!.id);
      await DocumentApp.updateDocument({
        parentDocumentId: firstDocument!.id,
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        metadata: connectorFormMetadata(firstFragment),
        input: { meta_description: TEST_META_DESCRIPTIONS.DEFAULT },
        existingImageIds: [],
      });

      // When a newer version is published
      const newerFragment = buildManifestFragment({
        slug,
        version: '7.260309.0',
      });
      await ManifestFragmentApp.ingestManifestFragments({
        manifestFragments: [newerFragment],
      });

      // Then the new latest version carries the same meta description
      const newerDocument = await TestHelper.document.load({
        slug,
        version: newerFragment.version,
      });
      createdDocumentIds.push(newerDocument!.id);
      expect(newerDocument).toMatchObject({
        slug,
        version: newerFragment.version,
        tags: expect.arrayContaining([TAG_LATEST]),
        meta_description: TEST_META_DESCRIPTIONS.DEFAULT,
      });
      const previousDocument = await TestHelper.document.load({
        id: firstDocument!.id,
      });
      expect(previousDocument).toMatchObject({
        tags: expect.not.arrayContaining([TAG_LATEST]),
        meta_description: TEST_META_DESCRIPTIONS.DEFAULT,
      });
    });
  });

  describe('use case linking', () => {
    beforeEach(() => {
      requestContext.set({ user: manifestIngestionUser });
    });

    it('should not create an unknown use case referenced by the manifest fragment', async () => {
      const args = buildArgs({ slug: 'misp-unknown-usecase' });
      args.manifestFragments[0]!.use_cases = ['Nonexistent UseCase XYZ'];

      await ManifestFragmentApp.ingestManifestFragments(args);

      const createdDocument = await TestHelper.document.load({
        slug: 'misp-unknown-usecase',
      });
      createdDocumentIds.push(createdDocument!.id);

      const useCase = await TestHelper.useCase.load({
        name: 'Nonexistent UseCase XYZ',
      });
      expect(useCase).toBeUndefined();

      const links = await TestHelper.objectUseCase.load({
        object_id: createdDocument!.id,
      });
      expect(links).toHaveLength(0);
    });
  });
});
