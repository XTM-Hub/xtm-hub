import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
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
import { BadRequestErrorCode } from '../../../utils/error/error.code';
import { ManifestRebuildQueueStatus } from '../manifest/manifest.consts';
import { ManifestHelper } from '../manifest/manifest.helper';
import { ManifestFragmentApp } from './manifest-fragment.app';

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

    it('rejects the whole batch before ingesting anything when a fragment has an unknown connector type', async () => {
      const unknownTypeFragment = buildManifestFragment({
        slug: 'misp-unknown-type-second',
      });
      unknownTypeFragment.image_type = 'INTERNAL_HUNTS';
      const args: MutationIngestManifestFragmentsArgs = {
        manifestFragments: [
          buildManifestFragment({ slug: 'misp-unknown-type-first' }),
          unknownTypeFragment,
        ],
      };

      await expect(
        ManifestFragmentApp.ingestManifestFragments(args)
      ).rejects.toThrow(BadRequestErrorCode.ConnectorTypeNotRecognized);

      const firstDocument = await TestHelper.document.load({
        slug: 'misp-unknown-type-first',
      });
      expect(firstDocument).toBeUndefined();
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
