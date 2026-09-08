import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextSimpleUserFiligran2,
  SERVICES,
  TEST_ORGANIZATIONS,
  TEST_USE_CASES,
} from '../../../tests/tests.const';
import {
  DocumentImageType,
  DocumentMetadataKeyCode,
  DocumentSourceType,
  FiligranProduct,
  IntegrationType,
  PlatformIdentifier,
  QueryPublicDocumentsArgs,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import Document from '../../model/kanel/public/Document';
import { OrganizationId } from '../../model/kanel/public/Organization';
import ServiceDefinition from '../../model/kanel/public/ServiceDefinition';
import ServiceInstance, {
  ServiceInstanceId,
} from '../../model/kanel/public/ServiceInstance';
import { MinIOClient } from '../../thirdparty/minio/client';
import { ErrorCode } from '../../utils/error/error.code';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { RegistrationApp } from '../registration/registration.app';
import { ServiceDefinitionDomain } from '../service/definition/service-definition.domain';
import { OPENAEV_SCENARIO_DOCUMENT_TYPE } from '../shareable-resource/openaev/scenario/scenario.model';
import {
  CUSTOM_DASHBOARD_METADATA_KEYS,
  OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
} from '../shareable-resource/opencti/custom-dashboard/custom-dashboard.model';
import {
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
  ThirdPartyIntegration,
} from '../shareable-resource/opencti/integration/integration.model';
import { solutionCategoryDomain } from '../solution-category/solution-category.domain';
import { TelemetryApp } from '../telemetry/telemetry.app';
import {
  TelemetryEventService,
  TelemetrySource,
} from '../telemetry/telemetry.const';
import { TelemetryEventType } from '../telemetry/telemetry.types';
import { DocumentApp } from './document.app';
import {
  ALL_METADATA_KEYS,
  DocumentTypeMappedByServiceDefinition,
  ServiceDefinitionIdentifiersByPlatformIdentifier,
  VAULT_DOCUMENT_TYPE,
} from './document.helper';
import { DOCUMENT_IMAGE_METADATA_KEYS, DocumentImage } from './document.model';
import { DocumentUploadsHelper } from './document.uploads.helper';
import { DocumentChildrenDomain } from './domain/document.children.domain';
import { DocumentDomain } from './domain/document.domain';
import {
  DocumentMetadataDomain,
  DocumentMetadataKeys,
} from './domain/document.metadata.domain';

describe('documentApp', () => {
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
    active: true,
    use_cases: [],
    solution_categories: [],
  };

  const documentUpdateData = {
    short_description: documentData.short_description,
    uploader_id: documentData.uploader_id,
    name: documentData.name,
    description: documentData.description,
    active: documentData.active,
  };

  const integrationMetadata = [
    {
      key: DocumentMetadataKeyCode.IntegrationType,
      value: IntegrationType.ThirdPartyIntegration,
    },
    {
      key: DocumentMetadataKeyCode.VendorUrl,
      value: 'https://example.com',
    },
  ];

  beforeEach(() => {
    vi.spyOn(DocumentUploadsHelper, 'processUploads').mockResolvedValue([
      minioFileMock,
    ]);
    vi.spyOn(MinIOClient, 'createFile').mockResolvedValue(minioFileMock);
    vi.spyOn(MinIOClient, 'deleteFile').mockResolvedValue();
  });

  afterEach(async () => {
    await TestHelper.document.delete({});
  });

  afterAll(async () => {
    vi.useRealTimers();
  });

  describe('createDocument', () => {
    it('should throw when metadata is missing', async () => {
      // When
      const call = DocumentApp.createDocument({
        input: documentData,
        metadata: [],
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DocumentMissingMetadata);
    });

    it('should throw when serviceDefinition is not found', async () => {
      // Given
      vi.spyOn(
        ServiceDefinitionDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue(undefined);

      // When
      const call = DocumentApp.createDocument({
        input: documentData,
        metadata: integrationMetadata,
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });

    it('should create document with metadata', async () => {
      // When
      const result = await DocumentApp.createDocument({
        input: documentData,
        metadata: integrationMetadata,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        sourceDocument: mockUpload,
      });

      const {
        use_cases: _use_cases,
        solution_categories: _solution_categories,
        ...expected
      } = documentData;

      // Then
      expect(result).toMatchObject({
        ...expected,
        integration_type: IntegrationType.ThirdPartyIntegration,
        vendor_url: 'https://example.com',
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
    });

    it('should persist provided data and validate each field in it', async () => {
      // Given
      const input = {
        short_description: 'created short description',
        slug: `persisted-data-create-${uuidv4()}`,
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        name: 'created name',
        description: 'created description',
        active: false,
        license_type: 'Commercial',
      };

      // When
      const result = await DocumentApp.createDocument({
        input,
        metadata: integrationMetadata,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        sourceDocument: mockUpload,
      });

      const persistedDocument = await DocumentDomain.loadDocumentBy({
        id: result.id,
      });
      const licenseTypeFromDb =
        await DocumentMetadataDomain.loadMetadataValueByKey(
          result.id,
          DocumentMetadataKeyCode.LicenseType
        );

      // Then
      expect(result.short_description).toBe(input.short_description);
      expect(result.slug).toBe(input.slug);
      expect(result.uploader_id).toBe(input.uploader_id);
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
      expect(result.active).toBe(input.active);
      expect(result.license_type).toBe(input.license_type);
      expect(result.integration_type).toBe(
        IntegrationType.ThirdPartyIntegration
      );
      expect(result.vendor_url).toBe('https://example.com');

      expect(persistedDocument).toMatchObject({
        short_description: input.short_description,
        slug: input.slug,
        uploader_id: input.uploader_id,
        name: input.name,
        description: input.description,
        active: input.active,
      });
      expect(licenseTypeFromDb).toBe(input.license_type);
    });

    it('should link all provided solution categories when multiple are provided on create', async () => {
      // Given
      const category1 = await solutionCategoryDomain.insertSolutionCategory({
        name: `category-${uuidv4()}`,
      });
      const category2 = await solutionCategoryDomain.insertSolutionCategory({
        name: `category-${uuidv4()}`,
      });

      // When
      const createdDocument = await DocumentApp.createDocument({
        input: {
          ...documentData,
          slug: `create-multi-solution-categories-${uuidv4()}`,
          solution_categories: [category1.id, category2.id],
        },
        metadata: integrationMetadata,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });

      // Then
      const links =
        await solutionCategoryDomain.buildSolutionCategoriesByDocumentIdQuery([
          createdDocument.id,
        ]);
      expect(links).toHaveLength(2);
      expect(links.map(({ id }) => id)).toEqual(
        expect.arrayContaining([category1.id, category2.id])
      );
    });

    it('should not use document file when document is a third party integration', async () => {
      // When
      const createdDocument = await DocumentApp.createDocument({
        input: documentData,
        metadata: integrationMetadata,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        sourceDocument: mockUpload,
      });

      // Then
      expect(createdDocument).toMatchObject({
        file_name: null,
        minio_name: null,
        mime_type: null,
      });
    });

    it('should create children image and logo documents', async () => {
      // When
      const createdDocument = await DocumentApp.createDocument({
        input: documentData,
        metadata: integrationMetadata,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        sourceDocument: mockUpload,
        images: [mockUpload],
        logo: mockUpload,
      });

      const children: DocumentImage[] =
        (await DocumentChildrenDomain.loadChildrenDocuments(
          createdDocument!.id,
          DOCUMENT_IMAGE_METADATA_KEYS
        )) as unknown as DocumentImage[];

      const image = children.find(
        (child) => child.image_type === DocumentImageType.Image
      );
      const logo = children.find(
        (child) => child.image_type === DocumentImageType.Logo
      );

      // Then
      expect(children).toHaveLength(2);
      expect(createdDocument).toBeDefined();
      expect(image).toBeDefined();
      expect(logo).toBeDefined();
    });

    it('should send a create telemetry event when creating a document', async () => {
      // Given
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      // When
      await DocumentApp.createDocument({
        input: documentData,
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.2.3' },
        ],
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        sourceDocument: mockUpload,
      });

      // Then
      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.CREATE,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        organization_type: 'Professional',
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        service: TelemetryEventService.CUSTOM_DASHBOARDS_LIBRARY,
        resource_id: expect.any(String),
        resource_title: documentData.name,
        status: 'published',
        service_type: undefined,
      });
    });

    it('should delegate news feed synchronization to NewsFeedApp.upsertResourceNewsFeed on document creation', async () => {
      // Given
      const upsertResourceNewsFeedSpy = vi
        .spyOn(NewsFeedApp, 'upsertResourceNewsFeed')
        .mockResolvedValue();

      // When
      const result = await DocumentApp.createDocument({
        input: { ...documentData, active: true, slug: 'news-feed-active-slug' },
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.0.0' },
        ],
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        sourceDocument: mockUpload,
      });

      // Then
      expect(upsertResourceNewsFeedSpy).toHaveBeenCalledOnce();
      expect(upsertResourceNewsFeedSpy).toHaveBeenCalledWith({
        documentBeforeUpdate: undefined,
        updatedDocument: expect.objectContaining({
          id: result!.id,
          active: true,
        }),
        serviceDefinitionIdentifier:
          ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      });
    });
  });

  describe('updateDocument', () => {
    let createdDocument: Document | undefined;
    beforeEach(async () => {
      await TestHelper.document.delete({});
      createdDocument = await DocumentApp.createDocument({
        input: documentData,
        metadata: integrationMetadata,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
    });
    it('should throw when metadata is missing', async () => {
      // When
      const call = DocumentApp.updateDocument({
        parentDocumentId: createdDocument!.id,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        metadata: [],
        input: documentData,
        existingImageIds: [],
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DocumentMissingMetadata);
    });

    it('should throw when serviceDefinition is not found', async () => {
      // Given
      vi.spyOn(
        ServiceDefinitionDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue(undefined);

      // When
      const call = DocumentApp.updateDocument({
        parentDocumentId: createdDocument!.id,
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        metadata: integrationMetadata,
        input: documentData,
        existingImageIds: [],
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });

    it('should throw DocumentNotFound when document does not exist', async () => {
      // Given
      const randomDocumentId = uuidv4() as Document['id'];

      // When
      const call = DocumentApp.updateDocument({
        parentDocumentId: randomDocumentId,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        metadata: integrationMetadata,
        input: documentData,
        existingImageIds: [],
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DocumentNotFound);
    });

    it('should throw DocumentNotFound when the document belongs to a different service instance', async () => {
      // When
      const call = DocumentApp.updateDocument({
        parentDocumentId: createdDocument!.id,
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        metadata: integrationMetadata,
        input: documentData,
        existingImageIds: [],
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DocumentNotFound);
    });

    it('should return fields when metadata is missing but optional', async () => {
      // When
      const result = await DocumentApp.updateDocument({
        parentDocumentId: createdDocument!.id,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.ThirdPartyIntegration,
          },
          {
            key: DocumentMetadataKeyCode.VendorUrl,
            value: 'https://changed.com',
          },
        ],
        input: documentData,
        existingImageIds: [],
      });

      // Then
      expect(result).toMatchObject({
        short_description: 'short_description',
        vendor_url: 'https://changed.com',
      });
    });

    it('should persist provided data and validate each field in it', async () => {
      // Given
      const customDashboardDocument = await DocumentApp.createDocument({
        input: {
          ...documentData,
          slug: `persisted-data-update-${uuidv4()}`,
        },
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.0.0' },
        ],
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        sourceDocument: mockUpload,
      });

      const input = {
        short_description: 'updated short description',
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        name: 'updated name',
        description: 'updated description',
        active: false,
        license_type: 'Commercial',
      };

      // When
      const result = await DocumentApp.updateDocument({
        parentDocumentId: customDashboardDocument.id,
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.1.0' },
        ],
        input,
        existingImageIds: [],
      });

      const persistedDocument = await DocumentDomain.loadDocumentBy({
        id: result.id,
      });
      const [licenseTypeFromDb, productVersionFromDb] = await Promise.all([
        DocumentMetadataDomain.loadMetadataValueByKey(
          result.id,
          DocumentMetadataKeyCode.LicenseType
        ),
        DocumentMetadataDomain.loadMetadataValueByKey(
          result.id,
          DocumentMetadataKeyCode.ProductVersion
        ),
      ]);

      // Then
      expect(result.short_description).toBe(input.short_description);
      expect(result.uploader_id).toBe(input.uploader_id);
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
      expect(result.active).toBe(input.active);
      expect(result.license_type).toBe(input.license_type);
      expect(result.product_version).toBe('1.1.0');

      expect(persistedDocument).toMatchObject({
        short_description: input.short_description,
        uploader_id: input.uploader_id,
        name: input.name,
        description: input.description,
        active: input.active,
      });

      expect(licenseTypeFromDb).toBe(input.license_type);
      expect(productVersionFromDb).toBe('1.1.0');
    });

    it('should use first file for document when document is not a third party integration', async () => {
      // When
      const result = await DocumentApp.updateDocument({
        parentDocumentId: createdDocument!.id,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
        ],
        sourceDocument: mockUpload,
        existingImageIds: [],
        input: documentData,
      });

      // Then
      expect(result).toMatchObject({
        file_name: minioFileMock.fileName,
        minio_name: minioFileMock.minioName,
        mime_type: minioFileMock.mimeType,
      });
    });

    it('should not use document file when document is a third party integration', async () => {
      // When
      const result = await DocumentApp.updateDocument({
        parentDocumentId: createdDocument!.id,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        metadata: integrationMetadata,
        sourceDocument: mockUpload,
        existingImageIds: [],
        input: documentData,
      });

      // Then
      expect(result).toMatchObject({
        file_name: null,
        minio_name: null,
        mime_type: null,
      });
    });

    it('should add a logo document when logo file is provided', async () => {
      // When
      const result = await DocumentApp.updateDocument({
        parentDocumentId: createdDocument!.id,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        metadata: integrationMetadata,
        sourceDocument: mockUpload,
        existingImageIds: [],
        input: documentData,
        logo: mockUpload,
      });

      const children = (await DocumentChildrenDomain.loadChildrenDocuments(
        result.id,
        DOCUMENT_IMAGE_METADATA_KEYS
      )) as unknown as DocumentImage[];

      const logo = children.find(
        (doc) => doc.image_type === DocumentImageType.Logo
      );

      // Then
      expect(logo).toMatchObject({
        file_name: minioFileMock.fileName,
        minio_name: minioFileMock.minioName,
        mime_type: minioFileMock.mimeType,
      });
    });

    it.each`
      label          | integrationType
      ${'CsvFeed'}   | ${IntegrationType.CsvFeed}
      ${'TaxiiFeed'} | ${IntegrationType.TaxiiFeed}
      ${'Stream'}    | ${IntegrationType.Stream}
    `(
      'should preserve the existing feed_url when no document is uploaded for $label',
      async ({ integrationType }: { integrationType: IntegrationType }) => {
        // Given
        const metadata = [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: integrationType,
          },
        ];

        // When
        const result = await DocumentApp.updateDocument({
          parentDocumentId: createdDocument!.id,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          metadata,
          input: documentUpdateData,
          sourceDocument: mockUpload,
          existingImageIds: [],
        });

        const feedUrlFromDb =
          await DocumentMetadataDomain.loadMetadataValueByKey(
            result!.id,
            DocumentMetadataKeyCode.FeedUrl
          );
        // Then
        expect(result).toMatchObject({ feed_url: 'https://example.com' });
        expect(feedUrlFromDb).toBe('https://example.com');
      }
    );

    it.each`
      label          | integrationType
      ${'CsvFeed'}   | ${IntegrationType.CsvFeed}
      ${'TaxiiFeed'} | ${IntegrationType.TaxiiFeed}
      ${'Stream'}    | ${IntegrationType.Stream}
    `(
      'should preserve the existing feed_url when an image file is uploaded instead of a json file for $label',
      async ({ integrationType }: { integrationType: IntegrationType }) => {
        // Given
        const slug = 'integration-slug';
        const metadata = [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: integrationType,
          },
        ];

        const createdDocument = await DocumentApp.createDocument({
          input: { ...documentData, slug },
          metadata,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          sourceDocument: mockUpload,
          images: [mockUpload],
        });

        vi.spyOn(MinIOClient, 'createFile').mockResolvedValue({
          minioName: 'imageFile',
          mimeType: 'image/png',
          fileName: 'image.png',
        });

        // When
        const result = await DocumentApp.updateDocument({
          parentDocumentId: createdDocument!.id,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          metadata,
          input: documentUpdateData,
          sourceDocument: mockUpload,
          existingImageIds: [],
        });
        const feedUrlFromDb =
          await DocumentMetadataDomain.loadMetadataValueByKey(
            result!.id,
            DocumentMetadataKeyCode.FeedUrl
          );

        // Then
        expect(result).toMatchObject({ feed_url: 'https://example.com' });
        expect(feedUrlFromDb).toBe('https://example.com');
      }
    );

    it('should convert boolean metadata keys to booleans on update', async () => {
      // Given
      // Create a Connector document with required metadata
      const connectorMetadata = [
        {
          key: DocumentMetadataKeyCode.IntegrationType,
          value: IntegrationType.Connector,
        },
        { key: DocumentMetadataKeyCode.ProductVersion, value: '1.0.0' },
        { key: DocumentMetadataKeyCode.Verified, value: 'false' },
        { key: DocumentMetadataKeyCode.ManagerSupported, value: 'false' },
        { key: DocumentMetadataKeyCode.PlaybookSupported, value: 'false' },
        {
          key: DocumentMetadataKeyCode.ContainerImage,
          value: 'container_image_value',
        },
        { key: DocumentMetadataKeyCode.SourceCode, value: 'source_code_value' },
        {
          key: DocumentMetadataKeyCode.SubscriptionLink,
          value: 'subscription_link_value',
        },
      ];
      const slug = 'connector-slug';
      const createdDocument = await DocumentApp.createDocument({
        input: { ...documentData, slug },
        metadata: connectorMetadata,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        sourceDocument: mockUpload,
      });

      // Update with boolean metadata as strings
      const updatedMetadata = [
        {
          key: DocumentMetadataKeyCode.IntegrationType,
          value: IntegrationType.Connector,
        },
        { key: DocumentMetadataKeyCode.ProductVersion, value: '2.0.0' },
        { key: DocumentMetadataKeyCode.Verified, value: 'true' },
        { key: DocumentMetadataKeyCode.ManagerSupported, value: 'true' },
        { key: DocumentMetadataKeyCode.PlaybookSupported, value: 'false' },
        {
          key: DocumentMetadataKeyCode.ContainerImage,
          value: 'container_image_value',
        },
        { key: DocumentMetadataKeyCode.SourceCode, value: 'source_code_value' },
        {
          key: DocumentMetadataKeyCode.SubscriptionLink,
          value: 'subscription_link_value',
        },
      ];

      // When
      const result = await DocumentApp.updateDocument({
        parentDocumentId: createdDocument!.id,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        metadata: updatedMetadata,
        input: documentUpdateData,
        existingImageIds: [],
      });

      // Then
      expect(result).toMatchObject({
        verified: true,
        manager_supported: true,
        playbook_supported: false,
        product_version: '2.0.0',
      });
    });

    it('should preserve slug when updating a document', async () => {
      // Given
      const originalSlug = 'my-original-slug';
      const documentWithSlug = await DocumentApp.createDocument({
        input: { ...documentData, slug: originalSlug },
        metadata: integrationMetadata,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });

      // When
      const updatedDocument = await DocumentApp.updateDocument({
        parentDocumentId: documentWithSlug!.id,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        metadata: integrationMetadata,
        input: {
          name: 'Updated Name',
          description: 'Updated description',
        },
        existingImageIds: [],
      });

      // Then
      expect(updatedDocument.slug).toBe(originalSlug);
    });

    describe('solution_categories linking', () => {
      it('should link solution categories when provided on update', async () => {
        // Given
        const category = await solutionCategoryDomain.insertSolutionCategory({
          name: `category-${uuidv4()}`,
        });

        // When
        await DocumentApp.updateDocument({
          parentDocumentId: createdDocument!.id,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          metadata: integrationMetadata,
          input: {
            ...documentUpdateData,
            solution_categories: [category.id],
          },
          existingImageIds: [],
        });

        // Then
        const links =
          await solutionCategoryDomain.buildSolutionCategoriesByDocumentIdQuery(
            [createdDocument!.id]
          );
        expect(links).toHaveLength(1);
        expect(links[0]).toMatchObject({
          _document_id: createdDocument!.id,
          id: category.id,
        });
      });

      it('should link all provided solution categories when multiple are provided on update', async () => {
        // Given
        const category1 = await solutionCategoryDomain.insertSolutionCategory({
          name: `category-${uuidv4()}`,
        });
        const category2 = await solutionCategoryDomain.insertSolutionCategory({
          name: `category-${uuidv4()}`,
        });

        // When
        await DocumentApp.updateDocument({
          parentDocumentId: createdDocument!.id,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          metadata: integrationMetadata,
          input: {
            ...documentUpdateData,
            solution_categories: [category1.id, category2.id],
          },
          existingImageIds: [],
        });

        // Then
        const links =
          await solutionCategoryDomain.buildSolutionCategoriesByDocumentIdQuery(
            [createdDocument!.id]
          );
        expect(links).toHaveLength(2);
        expect(links.map(({ id }) => id)).toEqual(
          expect.arrayContaining([category1.id, category2.id])
        );
      });

      it('should replace previous solution category link on update', async () => {
        // Given
        const category1 = await solutionCategoryDomain.insertSolutionCategory({
          name: `category-${uuidv4()}`,
        });
        const category2 = await solutionCategoryDomain.insertSolutionCategory({
          name: `category-${uuidv4()}`,
        });

        await DocumentApp.updateDocument({
          parentDocumentId: createdDocument!.id,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          metadata: integrationMetadata,
          input: {
            ...documentUpdateData,
            solution_categories: [category1.id],
          },
          existingImageIds: [],
        });

        // When
        await DocumentApp.updateDocument({
          parentDocumentId: createdDocument!.id,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          metadata: integrationMetadata,
          input: {
            ...documentUpdateData,
            solution_categories: [category2.id],
          },
          existingImageIds: [],
        });

        // Then
        const links =
          await solutionCategoryDomain.buildSolutionCategoriesByDocumentIdQuery(
            [createdDocument!.id]
          );
        expect(links).toHaveLength(1);
        expect(links[0]).toMatchObject({
          _document_id: createdDocument!.id,
          id: category2.id,
        });
      });

      it('should keep existing solution categories link when update omits solution_categories', async () => {
        // Given
        const category = await solutionCategoryDomain.insertSolutionCategory({
          name: `category-${uuidv4()}`,
        });

        await DocumentApp.updateDocument({
          parentDocumentId: createdDocument!.id,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          metadata: integrationMetadata,
          input: {
            ...documentUpdateData,
            solution_categories: [category.id],
          },
          existingImageIds: [],
        });

        // When
        await DocumentApp.updateDocument({
          parentDocumentId: createdDocument!.id,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
          metadata: integrationMetadata,
          input: documentUpdateData,
          existingImageIds: [],
        });

        // Then
        const links =
          await solutionCategoryDomain.buildSolutionCategoriesByDocumentIdQuery(
            [createdDocument!.id]
          );
        expect(links).toHaveLength(1);
        expect(links[0]).toMatchObject({
          _document_id: createdDocument!.id,
          id: category.id,
        });
      });
    });

    it('should delegate news feed synchronization to NewsFeedApp.upsertResourceNewsFeed', async () => {
      // Given
      const upsertResourceNewsFeedSpy = vi
        .spyOn(NewsFeedApp, 'upsertResourceNewsFeed')
        .mockResolvedValue();

      const inactiveDoc = await DocumentApp.createDocument({
        input: { ...documentData, active: false, slug: 'inactive-to-active' },
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.0.0' },
        ],
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        sourceDocument: mockUpload,
      });
      upsertResourceNewsFeedSpy.mockClear();

      // When
      const updatedDocument = await DocumentApp.updateDocument({
        parentDocumentId: inactiveDoc!.id,
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.0.0' },
        ],
        input: { active: true },
        existingImageIds: [],
      });

      // Then
      expect(upsertResourceNewsFeedSpy).toHaveBeenCalledOnce();
      expect(upsertResourceNewsFeedSpy).toHaveBeenCalledWith({
        documentBeforeUpdate: expect.objectContaining({
          id: inactiveDoc!.id,
          active: false,
        }),
        updatedDocument: expect.objectContaining({
          id: updatedDocument.id,
          active: true,
        }),
        serviceDefinitionIdentifier:
          ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      });
    });
  });

  describe('loadDocument', () => {
    it('should return the document with elastic search counters', async () => {
      // Given
      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myCustomDashboard',
          description: 'description',
          short_description: 'short_description',
          slug: 'slug',
          active: true,
        },
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.2.3' },
        ],
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        sourceDocument: mockUpload,
      });

      const documentId = document!.id;

      vi.spyOn(TelemetryApp, 'countEventsByDocumentId').mockImplementation(
        async (eventType: TelemetryEventType, calledDocumentId: string) => {
          if (
            calledDocumentId === documentId &&
            eventType === TelemetryEventType.DOWNLOAD
          )
            return 5;
          if (
            calledDocumentId === documentId &&
            eventType === TelemetryEventType.SHARE
          )
            return 12;
          return 0; // default
        }
      );

      // When
      const documentLoaded = await DocumentApp.loadDocument(documentId);

      // Then
      expect(documentLoaded.download_number).toBe(5);
      expect(documentLoaded.share_number).toBe(12);
    });
  });

  describe('loadPublicDocumentBySlug', () => {
    it('should throw when service definition is not found', async () => {
      // When
      const call = DocumentApp.loadPublicDocumentBySlug(
        uuidv4() as ServiceInstanceId,
        'slug'
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });

    it('should return the document with elastic search counters', async () => {
      // Given
      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myCustomDashboard',
          description: 'description',
          short_description: 'short_description',
          slug: 'slug',
          active: true,
        },
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.2.3' },
        ],
        serviceInstanceId: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        sourceDocument: mockUpload,
      });

      const documentId = document!.id;

      vi.spyOn(TelemetryApp, 'countEventsByDocumentId').mockImplementation(
        async (eventType: TelemetryEventType, calledDocumentId: string) => {
          if (
            calledDocumentId === documentId &&
            eventType === TelemetryEventType.DOWNLOAD
          )
            return 5;
          if (
            calledDocumentId === documentId &&
            eventType === TelemetryEventType.SHARE
          )
            return 12;
          return 0; // default
        }
      );

      // When
      const documentLoaded = await DocumentApp.loadPublicDocumentBySlug(
        SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
        document!.slug!
      );

      // Then
      expect(documentLoaded.download_number).toBe(5);
      expect(documentLoaded.share_number).toBe(12);
    });
  });

  describe('loadPublicDocumentsByServiceSlug', () => {
    it('should throw when service definition is not found', async () => {
      // When
      const call = DocumentApp.loadPublicDocumentsByServiceSlug('unknown-slug');

      // Then
      await expect(call).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });

    it('should return the documents', async () => {
      // Given
      const loadSeoDocumentsByServiceSlugSpy = vi
        .spyOn(DocumentDomain, 'loadSeoDocumentsByServiceSlug')
        .mockResolvedValue([{}]);

      // When
      await DocumentApp.loadPublicDocumentsByServiceSlug(
        SERVICES.INSTANCES.CUSTOM_DASHBOARDS.SLUG
      );

      // Then
      expect(loadSeoDocumentsByServiceSlugSpy).toHaveBeenCalledWith(
        OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_DASHBOARDS.SLUG,
        CUSTOM_DASHBOARD_METADATA_KEYS
      );
    });
  });

  describe('loadDocuments visibility', () => {
    let privateServiceInstance: ServiceInstance;

    beforeEach(async () => {
      const seededInstance = await TestHelper.serviceInstance.load({
        id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
      });
      privateServiceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: seededInstance!.service_definition_id,
        public: false,
        slug: `private-${uuidv4()}`,
      });
      await TestHelper.document.createWholeDocument({
        serviceInstanceId: privateServiceInstance.id,
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '1.2.3' },
        ],
      });
    });

    afterEach(async () => {
      await TestHelper.subscription.delete({
        service_instance_id: privateServiceInstance.id,
      });
      await TestHelper.serviceInstance.delete({
        id: privateServiceInstance.id,
      });
    });

    it('should not return documents of a private service instance the organization is not subscribed to', async () => {
      const result = await DocumentApp.loadDocuments({
        serviceInstanceId: privateServiceInstance.id,
      });

      expect(result.edges).toHaveLength(0);
    });

    it('should return documents of a private service instance the organization is subscribed to', async () => {
      await TestHelper.subscription.create({
        service_instance_id: privateServiceInstance.id,
        organization_id: requestContextSimpleUserFiligran2.user
          .selected_organization_id as OrganizationId,
      });

      const result = await DocumentApp.loadDocuments({
        serviceInstanceId: privateServiceInstance.id,
      });

      expect(result.edges).toHaveLength(1);
    });
  });

  describe('loadPublicDocuments', () => {
    it('should throw if service definition is not found', async () => {
      // Given
      vi.spyOn(
        ServiceDefinitionDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue(undefined);
      const input = { serviceInstanceId: 'invalid-id', slug: 'test-slug' };

      // When
      const call = DocumentApp.loadPublicDocuments(
        input as QueryPublicDocumentsArgs
      );
      // Then
      await expect(call).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });

    it('should call DocumentDomain.loadPaginatedSeoDocumentsByServiceSlug with correct params', async () => {
      // Given
      const mockServiceDefinition = {
        identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      };
      vi.spyOn(
        ServiceDefinitionDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue(mockServiceDefinition as ServiceDefinition);
      const loadPaginatedSeoDocumentsSpy = vi
        .spyOn(DocumentDomain, 'loadPaginatedSeoDocumentsByServiceSlug')
        .mockResolvedValue({
          edges: [],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
          totalCount: 0,
        });
      const input = {
        serviceInstanceId: 'valid-id',
        slug: 'test-slug',
        page: 1,
        pageSize: 10,
      };

      // When
      await DocumentApp.loadPublicDocuments(
        input as unknown as QueryPublicDocumentsArgs
      );

      // Then
      expect(loadPaginatedSeoDocumentsSpy).toHaveBeenCalledWith(
        'opencti_custom_dashboard',
        'test-slug',
        { page: 1, pageSize: 10, serviceInstanceId: 'valid-id' },
        [DocumentMetadataKeyCode.ProductVersion]
      );
    });
  });
  describe('createDocumentWithChildrenAndMetadata', () => {
    beforeEach(async () => {
      await TestHelper.objectUseCase.delete({});
    });

    it('should create a document without linking any use case when use_cases is omitted', async () => {
      // When
      const document = await DocumentApp.createDocumentWithChildrenAndMetadata(
        {
          name: 'Document without use cases',
          description: 'description',
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          active: true,
        },
        []
      );

      // Then
      const links = await TestHelper.objectUseCase.load({
        object_id: document.id,
      });
      expect(links).toHaveLength(0);
    });

    it('should create and link use cases by name when use_cases is provided', async () => {
      // When
      const document = await DocumentApp.createDocumentWithChildrenAndMetadata(
        {
          name: 'Document with use cases',
          description: 'description',
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          active: true,
          use_cases: [
            TEST_USE_CASES.DETECTION.NAME,
            TEST_USE_CASES.RESPONSE.NAME,
          ],
        },
        []
      );

      // Then
      const links = await TestHelper.objectUseCase.load({
        object_id: document.id,
      });
      expect(links).toHaveLength(2);
      expect(links?.map((link) => link.use_case_id)).toEqual(
        expect.arrayContaining([
          TEST_USE_CASES.DETECTION.ID,
          TEST_USE_CASES.RESPONSE.ID,
        ])
      );
    });

    it('should reuse an existing use case by name (case-insensitive) rather than duplicating it', async () => {
      // When
      const document = await DocumentApp.createDocumentWithChildrenAndMetadata(
        {
          name: 'Document reusing use case',
          description: 'description',
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          active: true,
          use_cases: ['detection'],
        },
        []
      );

      // Then — no duplicate "Detection" use case was created
      const detectionUseCases = await TestHelper.useCase.loadAll({
        name: TEST_USE_CASES.DETECTION.NAME,
      });
      expect(detectionUseCases).toHaveLength(1);

      const links = await TestHelper.objectUseCase.load({
        object_id: document.id,
      });
      expect(links).toHaveLength(1);
      expect(links?.[0]).toMatchObject({
        object_id: document.id,
        use_case_id: TEST_USE_CASES.DETECTION.ID,
      });
    });
  });

  describe('upsertDocumentWithExternalImage', () => {
    const metadataKeys = [
      {
        key: DocumentMetadataKeyCode.IntegrationType,
        value: IntegrationType.ThirdPartyIntegration,
      },
      { key: DocumentMetadataKeyCode.VendorUrl, value: 'https://example.com' },
    ] as unknown as DocumentMetadataKeys<ThirdPartyIntegration>;

    it('should create a new document with an external image', async () => {
      // Given
      const input = {
        ...documentData,
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      };

      // When
      const doc = await DocumentApp.upsertDocumentWithExternalImage(
        OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        input,
        mockUpload,
        metadataKeys,
        FiligranProduct.Opencti
      );
      const children = await DocumentChildrenDomain.loadChildrenDocuments(
        doc.id
      );
      // Then
      expect(doc).toMatchObject({
        id: expect.any(String),
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        file_name: null,
      });
      expect(children).toHaveLength(1);
      expect(children[0]).toMatchObject({
        source_type: DocumentSourceType.External,
        minio_name: minioFileMock.minioName,
      });
    });

    it('should update an existing document and replace external image', async () => {
      // Given
      // First create
      const input = {
        ...documentData,
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        slug: 'unique-slug',
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      };
      vi.spyOn(DocumentUploadsHelper, 'processUploads').mockResolvedValue([
        {
          ...minioFileMock,
          fileName: 'new-image.png',
        },
      ]);
      const newFileUpload = {
        ...mockUpload,
        file: { ...mockFileUpload, filename: 'new-image.png' },
      };
      // When
      const doc1 = await DocumentApp.upsertDocumentWithExternalImage(
        'integration',
        input,
        mockUpload,
        metadataKeys,
        FiligranProduct.Opencti
      );
      // Update with new image
      const doc2 = await DocumentApp.upsertDocumentWithExternalImage(
        'integration',
        input,
        newFileUpload,
        metadataKeys,
        FiligranProduct.Opencti
      );
      const children = await DocumentChildrenDomain.loadChildrenDocuments(
        doc2.id
      );

      // Then
      expect(doc2.id).toBe(doc1.id);

      expect(children).toHaveLength(1);
      expect(children[0]).toMatchObject({
        source_type: DocumentSourceType.External,
        file_name: 'new-image.png',
      });
    });

    describe('use_cases linking', () => {
      beforeEach(async () => {
        await TestHelper.objectUseCase.delete({});
      });

      it('should link use cases by name when creating a new document', async () => {
        // Given
        const input = {
          ...documentData,
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          slug: 'use-case-create-slug',
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          use_cases: [TEST_USE_CASES.DETECTION.NAME],
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
        const links = await TestHelper.objectUseCase.load({
          object_id: doc.id,
        });
        expect(links).toHaveLength(1);
        expect(links?.[0]).toMatchObject({
          object_id: doc.id,
          use_case_id: TEST_USE_CASES.DETECTION.ID,
        });
      });

      it('should replace previous use-case links with the new ones on update', async () => {
        // Given — first create with "Detection"
        const input = {
          ...documentData,
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          slug: 'use-case-update-slug',
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          use_cases: [TEST_USE_CASES.DETECTION.NAME],
        };
        const doc1 = await DocumentApp.upsertDocumentWithExternalImage(
          OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          input,
          mockUpload,
          metadataKeys,
          FiligranProduct.Opencti
        );

        // When — update with "Response" instead
        const doc2 = await DocumentApp.upsertDocumentWithExternalImage(
          OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          { ...input, use_cases: [TEST_USE_CASES.RESPONSE.NAME] },
          mockUpload,
          metadataKeys,
          FiligranProduct.Opencti
        );

        // Then
        expect(doc2.id).toBe(doc1.id);
        const links = await TestHelper.objectUseCase.load({
          object_id: doc2.id,
        });
        expect(links).toHaveLength(1);
        expect(links?.[0]).toMatchObject({
          object_id: doc2.id,
          use_case_id: TEST_USE_CASES.RESPONSE.ID,
        });
      });

      it('should leave existing use-case links untouched when the update omits use_cases', async () => {
        // Given — first create with "Detection"
        const input = {
          ...documentData,
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          slug: 'use-case-unchanged-slug',
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          use_cases: [TEST_USE_CASES.DETECTION.NAME],
        };
        const doc1 = await DocumentApp.upsertDocumentWithExternalImage(
          OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          input,
          mockUpload,
          metadataKeys,
          FiligranProduct.Opencti
        );

        // When — update without use_cases at all
        // NOTE: unlike `updateDocument` (which clears links when `use_cases`
        // is explicitly undefined), `upsertDocument` only touches links when
        // `use_cases?.length` is truthy — this is the current, intentional
        // behavior being verified here.
        const { use_cases: _useCases, ...inputWithoutUseCases } = input;
        const doc2 = await DocumentApp.upsertDocumentWithExternalImage(
          OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          inputWithoutUseCases,
          mockUpload,
          metadataKeys,
          FiligranProduct.Opencti
        );

        // Then — the original "Detection" link is still present
        expect(doc2.id).toBe(doc1.id);
        const links = await TestHelper.objectUseCase.load({
          object_id: doc2.id,
        });
        expect(links).toHaveLength(1);
        expect(links?.[0]).toMatchObject({
          object_id: doc2.id,
          use_case_id: TEST_USE_CASES.DETECTION.ID,
        });
      });
    });
  });

  describe('loadNewestDocuments', () => {
    beforeEach(async () => {
      await DocumentApp.createDocumentWithChildrenAndMetadata(
        {
          name: 'OpenCTI integration',
          description: 'description',
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          active: true,
        },
        []
      );
      await DocumentApp.createDocumentWithChildrenAndMetadata(
        {
          name: 'OpenAEV scenario',
          description: 'description',
          service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
          type: OPENAEV_SCENARIO_DOCUMENT_TYPE,
          active: true,
        },
        []
      );
    });

    it('should return only documents matching the given platformIdentifiers', async () => {
      // When
      const result = await DocumentApp.loadNewestDocuments(10, [
        PlatformIdentifier.Opencti,
      ]);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('OpenCTI integration');
    });

    it('should return all shareable documents when no platformIdentifiers are given', async () => {
      // When
      const result = await DocumentApp.loadNewestDocuments(10);

      // Then
      expect(result).toHaveLength(2);
    });

    it('should not include vault documents when no platformIdentifiers are given', async () => {
      // Given — a vault document alongside the shareable ones created in beforeEach
      await DocumentApp.createDocumentWithChildrenAndMetadata(
        {
          name: 'Vault document',
          description: 'description',
          service_instance_id: SERVICES.INSTANCES.VAULT.ID,
          type: VAULT_DOCUMENT_TYPE,
          active: true,
        },
        []
      );

      // When — no platform filter provided (homepage / unauthenticated caller scenario)
      const result = await DocumentApp.loadNewestDocuments(10);

      // Then — only the 2 shareable docs from beforeEach should be returned;
      // the vault document must not leak through the unfiltered query
      expect(result.map((d) => d.name)).not.toContain('Vault document');
      expect(result).toHaveLength(2);
    });

    it('should not include service_picture documents when no platformIdentifiers are given', async () => {
      // Given — a service picture (logo) document alongside the shareable ones created in beforeEach
      await DocumentApp.createDocumentWithChildrenAndMetadata(
        {
          name: 'Service logo',
          description: 'description',
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          type: 'service_picture',
          active: true,
        },
        []
      );

      // When — no platform filter provided (homepage / unauthenticated caller scenario)
      const result = await DocumentApp.loadNewestDocuments(10);

      // Then — only the 2 shareable docs from beforeEach should be returned;
      // the service_picture document must not leak through the unfiltered query
      expect(result.map((d) => d.name)).not.toContain('Service logo');
      expect(result).toHaveLength(2);
    });

    it('should enforce the 20-document cap when limit exceeds maximum', async () => {
      // Given
      const domainSpy = vi
        .spyOn(DocumentDomain, 'loadNewestDocuments')
        .mockResolvedValue([]);

      // When
      await DocumentApp.loadNewestDocuments(25);
      expect(domainSpy).toHaveBeenCalledWith(
        20,
        expect.any(Array),
        expect.any(Array)
      );
    });
  });
});

describe('loadMostDeployedDocuments', () => {
  const allShareableDocumentTypes = [
    ...ServiceDefinitionIdentifiersByPlatformIdentifier.values(),
  ]
    .flat()
    .map((identifier) => DocumentTypeMappedByServiceDefinition[identifier]);

  it('delegates to DocumentDomain with all shareable document types when no platform filter', async () => {
    const documents = [{ id: uuidv4() }] as never;
    const domainSpy = vi
      .spyOn(DocumentDomain, 'loadMostDeployedDocuments')
      .mockResolvedValue(documents);

    const result = await DocumentApp.loadMostDeployedDocuments(7);

    expect(result).toBe(documents);
    expect(domainSpy).toHaveBeenCalledWith(
      7,
      ALL_METADATA_KEYS,
      allShareableDocumentTypes
    );
  });

  it('maps platformIdentifiers to their document types', async () => {
    const domainSpy = vi
      .spyOn(DocumentDomain, 'loadMostDeployedDocuments')
      .mockResolvedValue([] as never);

    await DocumentApp.loadMostDeployedDocuments(5, [
      PlatformIdentifier.Openaev,
    ]);

    expect(domainSpy).toHaveBeenCalledWith(5, ALL_METADATA_KEYS, [
      OPENAEV_SCENARIO_DOCUMENT_TYPE,
    ]);
  });

  describe('loadLastDeployedOverview', () => {
    it('throws when the platform is not registered in the organization', async () => {
      vi.spyOn(RegistrationApp, 'loadRegisteredPlatform').mockResolvedValue(
        null
      );

      await expect(
        DocumentApp.loadLastDeployedOverview(
          4,
          'unknown-service-instance' as ServiceInstanceId
        )
      ).rejects.toThrow(ErrorCode.PlatformNotRegistered);
    });

    it('returns an empty overview when the registered platform has no deployments', async () => {
      vi.spyOn(RegistrationApp, 'loadRegisteredPlatform').mockResolvedValue({
        platform_id: 'platform-1',
        tenant_id: null,
      } as never);
      vi.spyOn(TelemetryApp, 'getLastDeployments').mockResolvedValue([]);

      const result = await DocumentApp.loadLastDeployedOverview(
        4,
        'service-instance-1' as ServiceInstanceId
      );

      expect(result).toEqual({ resources: [] });
    });

    it('returns the deployed overview containing documents when the platform has deployments', async () => {
      vi.spyOn(RegistrationApp, 'loadRegisteredPlatform').mockResolvedValue({
        platform_id: 'platform-1',
        tenant_id: null,
      } as never);

      vi.spyOn(TelemetryApp, 'getLastDeployments').mockResolvedValue([
        {
          resource_id: 'doc-1',
          deployed_at: '2023-01-01T12:00:00Z',
          user_id: 'user-1',
        },
      ] as never);

      vi.spyOn(
        DocumentDomain,
        'loadDocumentsWithMetadataByIds'
      ).mockResolvedValue([{ id: 'doc-1', name: 'Document A' }] as never);

      const result = await DocumentApp.loadLastDeployedOverview(
        4,
        'service-instance-1' as ServiceInstanceId
      );

      expect(result).toEqual({
        resources: [
          {
            document: { id: 'doc-1', name: 'Document A' },
            deployedAt: '2023-01-01T12:00:00Z',
            deployedById: 'user-1',
          },
        ],
      });
    });
  });
});
