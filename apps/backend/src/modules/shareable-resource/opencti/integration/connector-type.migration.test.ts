import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '../../../../../knexfile';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  DocumentMetadataKeyCode,
  ManifestType,
  PlatformIdentifier,
} from '../../../../__generated__/resolvers-types';
import {
  INTERNAL_HUNT_MINIMUM_VERSION,
  INTERNAL_HUNT_MINIMUM_VERSION_PADDED,
  up,
} from '../../../../migrations/20261003230000_apply_internal_hunt_minimum_deployable_version.js';
import type { DocumentId } from '../../../../model/kanel/public/Document';
import type { ManifestId } from '../../../../model/kanel/public/Manifest';
import { ManifestFragmentHelper } from '../../manifest-fragment/manifest-fragment.helper';
import { ManifestRebuildQueueStatus } from '../../manifest/manifest.consts';
import { ManifestDomain } from '../../manifest/manifest.domain';
import { MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE } from './connector-type.helper';
import {
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from './integration.model';

describe('apply_internal_hunt_minimum_deployable_version migration', () => {
  let createdDocumentIds: DocumentId[] = [];

  afterEach(async () => {
    for (const documentId of createdDocumentIds) {
      await TestHelper.documentMetadata.delete({ document_id: documentId });
      await TestHelper.document.delete({ id: documentId });
    }
    createdDocumentIds = [];
  });

  const createConnector = async (
    metadata: Partial<Record<DocumentMetadataKeyCode, string>>
  ): Promise<DocumentId> => {
    const document = await TestHelper.document.create({
      name: `hunt-floor-${uuidv4()}`,
      slug: `hunt-floor-${uuidv4()}`,
      type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      active: true,
      service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
    });
    createdDocumentIds.push(document.id);
    for (const [key, value] of Object.entries(metadata)) {
      await TestHelper.documentMetadata.create({
        document_id: document.id,
        key: key as DocumentMetadataKeyCode,
        value,
      });
    }
    return document.id;
  };

  const loadMinimumVersions = async (documentId: DocumentId) => {
    const rows = await TestHelper.documentMetadata.loadAll({
      document_id: documentId,
    });
    const byKey = new Map(rows.map((row) => [row.key as string, row.value]));
    return {
      version: byKey.get(DocumentMetadataKeyCode.MinimumDeployableVersion),
      padded: byKey.get(DocumentMetadataKeyCode.MinimumDeployableVersionPadded),
    };
  };

  const loadImageType = async (documentId: DocumentId) => {
    const row = await TestHelper.documentMetadata.load({
      document_id: documentId,
      key: DocumentMetadataKeyCode.ImageType,
    });
    return row?.value;
  };

  it('uses the same floor as the connector type helper', () => {
    const floor = MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE.INTERNAL_HUNT!;
    expect(INTERNAL_HUNT_MINIMUM_VERSION).toBe(floor);
    expect(INTERNAL_HUNT_MINIMUM_VERSION_PADDED).toBe(
      ManifestFragmentHelper.validateAndFormatManifestVersion(floor)
    );
  });

  it('raises hunt connectors below the floor, keeps the others and can run twice', async () => {
    // Given
    const belowFloor = await createConnector({
      [DocumentMetadataKeyCode.ImageType]: 'INTERNAL_HUNT',
      [DocumentMetadataKeyCode.MinimumDeployableVersion]: '7.261002.0',
      [DocumentMetadataKeyCode.MinimumDeployableVersionPadded]:
        '007.261002.000',
    });
    const withoutMinimum = await createConnector({
      [DocumentMetadataKeyCode.ImageType]: 'INTERNAL_HUNT',
    });
    const aboveFloor = await createConnector({
      [DocumentMetadataKeyCode.ImageType]: 'INTERNAL_HUNT',
      [DocumentMetadataKeyCode.MinimumDeployableVersion]: '7.261015.0',
      [DocumentMetadataKeyCode.MinimumDeployableVersionPadded]:
        '007.261015.000',
    });
    const otherType = await createConnector({
      [DocumentMetadataKeyCode.ImageType]: 'EXTERNAL_IMPORT',
      [DocumentMetadataKeyCode.MinimumDeployableVersion]: '7.260811.0',
      [DocumentMetadataKeyCode.MinimumDeployableVersionPadded]:
        '007.260811.000',
    });

    // When
    await up(db);
    await up(db);

    // Then
    const floor = { version: '7.261003.0', padded: '007.261003.000' };
    expect(await loadMinimumVersions(belowFloor)).toEqual(floor);
    expect(await loadMinimumVersions(withoutMinimum)).toEqual(floor);
    expect(await loadMinimumVersions(aboveFloor)).toEqual({
      version: '7.261015.0',
      padded: '007.261015.000',
    });
    expect(await loadMinimumVersions(otherType)).toEqual({
      version: '7.260811.0',
      padded: '007.260811.000',
    });
  });

  it('stores legacy connector type spellings in their canonical form and applies the floor to them', async () => {
    // Given
    const dashed = await createConnector({
      [DocumentMetadataKeyCode.ImageType]: 'internal-hunt',
      [DocumentMetadataKeyCode.MinimumDeployableVersion]: '7.261001.0',
      [DocumentMetadataKeyCode.MinimumDeployableVersionPadded]:
        '007.261001.000',
    });
    const padded = await createConnector({
      [DocumentMetadataKeyCode.ImageType]: ' INTERNAL_HUNT ',
    });
    const lowerCase = await createConnector({
      [DocumentMetadataKeyCode.ImageType]: 'internal_enrichment',
      [DocumentMetadataKeyCode.MinimumDeployableVersion]: '7.260811.0',
      [DocumentMetadataKeyCode.MinimumDeployableVersionPadded]:
        '007.260811.000',
    });
    const unknown = await createConnector({
      [DocumentMetadataKeyCode.ImageType]: 'custom-type',
    });

    // When
    await up(db);
    await up(db);

    // Then
    const floor = { version: '7.261003.0', padded: '007.261003.000' };
    expect(await loadImageType(dashed)).toBe('INTERNAL_HUNT');
    expect(await loadMinimumVersions(dashed)).toEqual(floor);
    expect(await loadImageType(padded)).toBe('INTERNAL_HUNT');
    expect(await loadMinimumVersions(padded)).toEqual(floor);
    expect(await loadImageType(lowerCase)).toBe('INTERNAL_ENRICHMENT');
    expect(await loadMinimumVersions(lowerCase)).toEqual({
      version: '7.260811.0',
      padded: '007.260811.000',
    });
    expect(await loadImageType(unknown)).toBe('custom-type');
  });

  describe('manifests published before the floor', () => {
    const BELOW_FLOOR_VERSION = '7.261002.0';
    const ABOVE_FLOOR_VERSION = '7.261010.0';
    const createdManifestIds: ManifestId[] = [];

    afterEach(async () => {
      for (const id of createdManifestIds) {
        await TestHelper.manifestDocument.delete({ manifest_id: id });
        await TestHelper.manifest.delete({ id });
      }
      createdManifestIds.length = 0;
      for (const version of [BELOW_FLOOR_VERSION, ABOVE_FLOOR_VERSION]) {
        await TestHelper.manifestRebuildQueue.delete({ version });
      }
    });

    const publishManifest = async (
      version: string,
      documentIds: DocumentId[]
    ): Promise<ManifestId> => {
      const manifest = await TestHelper.manifest.create({
        version,
        name: `connector-manifest-${version}-${uuidv4()}`,
      });
      createdManifestIds.push(manifest.id);
      await ManifestDomain.insertManifestDocumentLinks(
        manifest.id,
        documentIds
      );
      return manifest.id;
    };

    it('withdraws the manifests that offered a hunt connector below the floor and queues their rebuild', async () => {
      // Given
      const huntConnector = await createConnector({
        [DocumentMetadataKeyCode.ImageType]: 'INTERNAL_HUNT',
        [DocumentMetadataKeyCode.MinimumDeployableVersion]: '7.261001.0',
        [DocumentMetadataKeyCode.MinimumDeployableVersionPadded]:
          '007.261001.000',
      });
      const otherConnector = await createConnector({
        [DocumentMetadataKeyCode.ImageType]: 'EXTERNAL_IMPORT',
      });
      const staleManifest = await publishManifest(BELOW_FLOOR_VERSION, [
        huntConnector,
        otherConnector,
      ]);
      const previousManifest = await publishManifest(BELOW_FLOOR_VERSION, [
        otherConnector,
      ]);
      const supportedManifest = await publishManifest(ABOVE_FLOOR_VERSION, [
        huntConnector,
        otherConnector,
      ]);

      // When
      await up(db);
      await up(db);

      // Then
      expect(await TestHelper.manifest.load({ id: staleManifest })).toBe(
        undefined
      );
      expect(
        await TestHelper.manifestDocument.loadAll({
          manifest_id: staleManifest,
        })
      ).toEqual([]);
      expect(
        await TestHelper.manifest.load({ id: previousManifest })
      ).toBeDefined();
      expect(
        await TestHelper.manifest.load({ id: supportedManifest })
      ).toBeDefined();

      const belowFloorQueue = await TestHelper.manifestRebuildQueue.loadAll({
        version: BELOW_FLOOR_VERSION,
      });
      expect(belowFloorQueue).toEqual([
        expect.objectContaining({
          product: PlatformIdentifier.Opencti,
          type: ManifestType.Connector,
          status: ManifestRebuildQueueStatus.Pending,
        }),
      ]);
      expect(
        await TestHelper.manifestRebuildQueue.loadAll({
          version: ABOVE_FLOOR_VERSION,
        })
      ).toEqual([]);
    });

    it('withdraws stale manifests of hunt connectors already raised to the floor', async () => {
      // Given
      const huntConnector = await createConnector({
        [DocumentMetadataKeyCode.ImageType]: 'INTERNAL_HUNT',
        [DocumentMetadataKeyCode.MinimumDeployableVersion]:
          INTERNAL_HUNT_MINIMUM_VERSION,
        [DocumentMetadataKeyCode.MinimumDeployableVersionPadded]:
          INTERNAL_HUNT_MINIMUM_VERSION_PADDED,
      });
      const staleManifest = await publishManifest(BELOW_FLOOR_VERSION, [
        huntConnector,
      ]);

      // When
      await up(db);

      // Then
      expect(await TestHelper.manifest.load({ id: staleManifest })).toBe(
        undefined
      );
      expect(
        await TestHelper.manifestRebuildQueue.loadAll({
          version: BELOW_FLOOR_VERSION,
        })
      ).toHaveLength(1);
    });
  });
});
