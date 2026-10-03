import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '../../../../../knexfile';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import { DocumentMetadataKeyCode } from '../../../../__generated__/resolvers-types';
import {
  INTERNAL_HUNT_MINIMUM_VERSION,
  INTERNAL_HUNT_MINIMUM_VERSION_PADDED,
  up,
} from '../../../../migrations/20261003230000_apply_internal_hunt_minimum_deployable_version.js';
import type { DocumentId } from '../../../../model/kanel/public/Document';
import { ManifestFragmentHelper } from '../../manifest-fragment/manifest-fragment.helper';
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
});
