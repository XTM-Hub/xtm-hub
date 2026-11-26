import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  DocumentMetadataKeyCode,
  DocumentStatus,
  FiligranProduct,
  IntegrationType,
  LicenseType,
} from '../../__generated__/resolvers-types';
import { MinIOClient } from '../../thirdparty/minio/client';
import {
  INTEGRATION_CONNECTOR_METADATA_KEYS,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
  ThirdPartyIntegration,
} from '../shareable-resource/opencti/integration/integration.model';
import { solutionCategoryDomain } from '../solution-category/solution-category.domain';
import { DocumentApp } from './document.app';
import { DocumentUploadsHelper } from './document.uploads.helper';
import {
  DocumentMetadataDomain,
  DocumentMetadataKeys,
} from './domain/document.metadata.domain';

const minioFileMock = {
  minioName: 'minioFile',
  mimeType: 'mimeType',
  fileName: 'csvfilename',
  jsonContent: { configuration: { uri: 'https://example.com' } },
};

const mockFileUpload: FileUpload = {
  filename: 'test-image.png',
  mimetype: 'image/png',
  encoding: '7bit',
  createReadStream: vi.fn(),
};

const mockUpload = {
  file: mockFileUpload,
  promise: Promise.resolve(mockFileUpload),
};

const documentData = {
  short_description: 'short_description',
  slug: 'slug',
  uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
  name: 'name',
  description: 'description',
  status: DocumentStatus.Published,
  use_cases: [],
};

const metadataKeys = [
  {
    key: DocumentMetadataKeyCode.IntegrationType,
    value: IntegrationType.ThirdPartyIntegration,
  },
  { key: DocumentMetadataKeyCode.VendorUrl, value: 'https://example.com' },
] as unknown as DocumentMetadataKeys<ThirdPartyIntegration>;

describe('solution_categories linking', () => {
  beforeEach(() => {
    vi.spyOn(DocumentUploadsHelper, 'processUploads').mockResolvedValue([
      minioFileMock,
    ]);
    vi.spyOn(MinIOClient, 'createFile').mockResolvedValue(minioFileMock);
    vi.spyOn(MinIOClient, 'deleteFile').mockResolvedValue();
  });

  beforeEach(async () => {
    await TestHelper.objectSolutionCategory.delete({});
  });

  afterEach(async () => {
    await TestHelper.document.delete({});
  });

  it('should link solution categories by name when creating a new document', async () => {
    // Given
    const input = {
      ...documentData,
      uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      slug: 'solution-category-create-slug',
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      solution_categories: [
        'Threat Intelligence Feed',
        'Endpoint Detection & Response',
      ],
    };

    // When
    const doc = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      input,
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // Then
    const links = await TestHelper.objectSolutionCategory.load({
      object_id: doc.id,
    });
    expect(links).toHaveLength(2);

    const [tifCategory, edrCategory] = await Promise.all([
      solutionCategoryDomain.loadSolutionCategoryBy({
        name: 'Threat Intelligence Feed',
      }),
      solutionCategoryDomain.loadSolutionCategoryBy({
        name: 'Endpoint Detection & Response',
      }),
    ]);
    expect(links?.map((link) => link.solution_category_id)).toEqual(
      expect.arrayContaining([tifCategory?.id, edrCategory?.id])
    );
  });

  it('should replace previous solution-category links with the new ones on update', async () => {
    // Given — first create with two categories
    const input = {
      ...documentData,
      uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      slug: 'solution-category-update-slug',
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      solution_categories: [
        'Threat Intelligence Feed',
        'Endpoint Detection & Response',
      ],
    };
    const doc1 = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      input,
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // When — update with a single category
    const doc2 = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      { ...input, solution_categories: ['Network Security'] },
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // Then
    expect(doc2.id).toBe(doc1.id);
    const links = await TestHelper.objectSolutionCategory.load({
      object_id: doc2.id,
    });
    expect(links).toHaveLength(1);
    const networkSecurityCategory =
      await solutionCategoryDomain.loadSolutionCategoryBy({
        name: 'Network Security',
      });
    expect(links?.[0]?.solution_category_id).toBe(networkSecurityCategory?.id);
  });

  it('should ignore unknown solution categories without rejecting the document', async () => {
    // Given
    const input = {
      ...documentData,
      uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      slug: 'solution-category-unknown-slug',
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      solution_categories: ['Not A Real Category'],
    };

    // When
    const doc = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      input,
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // Then — the document exists, no link was created
    expect(doc.id).toEqual(expect.any(String));
    const links = await TestHelper.objectSolutionCategory.load({
      object_id: doc.id,
    });
    expect(links).toHaveLength(0);
  });

  it('should remove all solution-category links when an empty list is provided on update', async () => {
    // Given — first create with two categories
    const input = {
      ...documentData,
      uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      slug: 'solution-category-empty-slug',
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      solution_categories: [
        'Threat Intelligence Feed',
        'Endpoint Detection & Response',
      ],
    };
    const doc1 = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      input,
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // When — update with an empty list (manifest cleared the categories)
    const doc2 = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      { ...input, solution_categories: [] },
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // Then — the previous links are gone
    expect(doc2.id).toBe(doc1.id);
    const links = await TestHelper.objectSolutionCategory.load({
      object_id: doc2.id,
    });
    expect(links).toHaveLength(0);
  });

  it('should leave existing solution-category links untouched when the update omits solution_categories', async () => {
    // Given — first create with two categories
    const input = {
      ...documentData,
      uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      slug: 'solution-category-untouched-slug',
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      solution_categories: [
        'Threat Intelligence Feed',
        'Endpoint Detection & Response',
      ],
    };
    const doc1 = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      input,
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // When — update without solution_categories at all
    // NOTE: unlike `use_cases` above, `solution_categories` distinguishes
    // "absent" (leave links untouched) from "empty" (clear links, see the
    // previous test) — the zod schema allows the field to be missing (nullish).
    const {
      solution_categories: _solutionCategories,
      ...inputWithoutCategories
    } = input;
    const doc2 = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      inputWithoutCategories,
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // Then — the original two links are still present
    expect(doc2.id).toBe(doc1.id);
    const links = await TestHelper.objectSolutionCategory.load({
      object_id: doc2.id,
    });
    expect(links).toHaveLength(2);
  });

  it('should clear previous links when the update provides only unknown categories', async () => {
    // Given — first create with two valid categories
    const input = {
      ...documentData,
      uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      slug: 'solution-category-unknown-update-slug',
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      solution_categories: [
        'Threat Intelligence Feed',
        'Endpoint Detection & Response',
      ],
    };
    const doc1 = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      input,
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // When — update with a name that resolves to nothing (e.g. an upstream typo)
    const doc2 = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      { ...input, solution_categories: ['Not A Real Category'] },
      mockUpload,
      metadataKeys,
      FiligranProduct.Opencti
    );

    // Then — deliberate: the resolved manifest set is the new truth, even when
    // empty. The previous links are cleared; the only trace is the "unknown
    // solution categories" warning emitted by the resolver.
    expect(doc2.id).toBe(doc1.id);
    const links = await TestHelper.objectSolutionCategory.load({
      object_id: doc2.id,
    });
    expect(links).toHaveLength(0);
  });
  it('should persist license_type and contact as document metadata', async () => {
    // Given
    const input = {
      ...documentData,
      uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      slug: 'metadata-persistence-slug',
      service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      license_type: LicenseType.Commercial,
      contact: 'contributor@example.com',
    };

    // When
    const doc = await DocumentApp.upsertDocumentWithExternalImage(
      OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      input,
      mockUpload,
      INTEGRATION_CONNECTOR_METADATA_KEYS,
      FiligranProduct.Opencti
    );

    // Then — the values landed in Document_Metadata
    const [licenseTypeFromDb, contactFromDb] = await Promise.all([
      DocumentMetadataDomain.loadMetadataValueByKey(
        doc.id,
        DocumentMetadataKeyCode.LicenseType
      ),
      DocumentMetadataDomain.loadMetadataValueByKey(
        doc.id,
        DocumentMetadataKeyCode.Contact
      ),
    ]);
    expect(licenseTypeFromDb).toBe(LicenseType.Commercial);
    expect(contactFromDb).toBe('contributor@example.com');
  });
});
