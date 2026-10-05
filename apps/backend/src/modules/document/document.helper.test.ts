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
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  DocumentMetadataKeyCode,
  IntegrationType,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { default as DocumentModel } from '../../model/kanel/public/Document';
import { MinIOClient } from '../../thirdparty/minio/client';
import { MinioFile } from '../../thirdparty/minio/types';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
import { OPENAEV_SCENARIO_DOCUMENT_TYPE } from '../shareable-resource/openaev/scenario/scenario.model';
import { OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE } from '../shareable-resource/opencti/custom-dashboard/custom-dashboard.model';
import {
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../shareable-resource/opencti/integration/integration.model';
import { TelemetryApp } from '../telemetry/telemetry.app';
import { TelemetryEventType } from '../telemetry/telemetry.types';
import { DocumentApp } from './document.app';
import {
  type Document,
  DocumentHelper,
  ManageableServiceDefinitionIdentifier,
} from './document.helper';
import { DocumentUploadsHelper } from './document.uploads.helper';
import { DocumentDomain } from './domain/document.domain';

describe('documentHelper', () => {
  const minioFileMock = {
    minioName: 'minioFile',
    mimeType: 'mimeType',
    fileName: 'csvfilename',
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

  beforeEach(() => {
    vi.spyOn(DocumentUploadsHelper, 'processUploads').mockResolvedValue([
      minioFileMock,
    ]);
  });

  afterEach(async () => {
    await TestHelper.document.delete({});
  });

  describe('loadDocumentWithCountersById', () => {
    afterAll(async () => {
      vi.useRealTimers();
    });

    it('should return the document with elastic search counters', async () => {
      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myCsvFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'slug',
          active: true,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://example.com',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });
      expect(document).toBeDefined();

      const documentId = document!.id;

      vi.spyOn(TelemetryApp, 'countEventsByDocumentId').mockImplementation(
        async (eventType: TelemetryEventType, eventDocumentId: string) => {
          if (
            eventDocumentId === documentId &&
            eventType === TelemetryEventType.DOWNLOAD
          )
            return 5;
          if (
            eventDocumentId === documentId &&
            eventType === TelemetryEventType.SHARE
          )
            return 12;
          return 0; // default
        }
      );

      const documentLoaded =
        await DocumentHelper.loadDocumentWithCountersById(documentId);

      expect(documentLoaded.download_number).toBe(5);
      expect(documentLoaded.share_number).toBe(12);
    });

    it('should throw an error document is not found', async () => {
      const call = DocumentHelper.loadDocumentWithCountersById(uuidv4());

      await expect(call).rejects.toThrow(ErrorCode.DocumentNotFound);
    });
  });

  describe('buildCompleteMetadataFromDocumentFile', () => {
    it('should return unchanged metadata when document is not a feed', () => {
      const metadata = [
        {
          key: DocumentMetadataKeyCode.IntegrationType,
          value: IntegrationType.Connector,
        },
      ];
      const sourceDocumentFile = undefined;

      const result = DocumentHelper.buildCompleteMetadataFromDocumentFile({
        sourceDocumentFile,
        metadata,
      });

      expect(result).toEqual(metadata);
    });

    it('should return unchanged metadata when JSON file is not provided', () => {
      const metadata = [
        {
          key: DocumentMetadataKeyCode.IntegrationType,
          value: IntegrationType.CsvFeed,
        },
      ];
      const sourceDocumentFile = undefined;

      const result = DocumentHelper.buildCompleteMetadataFromDocumentFile({
        sourceDocumentFile,
        metadata,
      });

      expect(result).toEqual(metadata);
    });

    it('should return unchanged metadata when JSON file does not contain configuration', () => {
      const metadata = [
        {
          key: DocumentMetadataKeyCode.IntegrationType,
          value: IntegrationType.CsvFeed,
        },
      ];
      const sourceDocumentFile = { jsonContent: {} } as MinioFile;

      const result = DocumentHelper.buildCompleteMetadataFromDocumentFile({
        sourceDocumentFile,
        metadata,
      });

      expect(result).toEqual(metadata);
    });

    it('should return unchanged metadata when JSON file contains no URI', () => {
      const metadata = [
        {
          key: DocumentMetadataKeyCode.IntegrationType,
          value: IntegrationType.CsvFeed,
        },
      ];
      const sourceDocumentFile = {
        jsonContent: { configuration: {} },
      } as unknown as MinioFile;

      const result = DocumentHelper.buildCompleteMetadataFromDocumentFile({
        sourceDocumentFile,
        metadata,
      });

      expect(result).toEqual(metadata);
    });

    it('should return unchanged metadata when URI in the JSON file is not valid', () => {
      const metadata = [
        {
          key: DocumentMetadataKeyCode.IntegrationType,
          value: IntegrationType.CsvFeed,
        },
      ];
      const sourceDocumentFile = {
        jsonContent: { configuration: { uri: 'hello' } },
      } as unknown as MinioFile;

      const result = DocumentHelper.buildCompleteMetadataFromDocumentFile({
        sourceDocumentFile,
        metadata,
      });

      expect(result).toEqual(metadata);
    });

    it('should add feed url to metadata when JSON file contains URI', () => {
      const metadata = [
        {
          key: DocumentMetadataKeyCode.IntegrationType,
          value: IntegrationType.CsvFeed,
        },
      ];
      const sourceDocumentFile = {
        jsonContent: { configuration: { uri: 'https://example.com' } },
      } as unknown as MinioFile;

      const result = DocumentHelper.buildCompleteMetadataFromDocumentFile({
        sourceDocumentFile,
        metadata,
      });

      expect(result).toEqual([
        ...metadata,
        { key: DocumentMetadataKeyCode.FeedUrl, value: 'https://example.com' },
      ]);
    });
  });

  describe('retrieveDocumentTypeFromServiceDefinition', () => {
    it('should throw when service is not manageable', () => {
      expect(() =>
        DocumentHelper.retrieveDocumentTypeFromServiceDefinition(
          ServiceDefinitionIdentifier.Link as ManageableServiceDefinitionIdentifier
        )
      ).toThrow(ErrorCode.ServiceNotManageable);
    });

    it.each`
      identifier                                             | documentType
      ${ServiceDefinitionIdentifier.OpenctiIntegrations}     | ${OPENCTI_INTEGRATION_DOCUMENT_TYPE}
      ${ServiceDefinitionIdentifier.OpenctiCustomDashboards} | ${OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE}
      ${ServiceDefinitionIdentifier.OpenaevScenarios}        | ${OPENAEV_SCENARIO_DOCUMENT_TYPE}
    `(
      'should return $documentType when service definition identifier is $identifier',
      ({ identifier, documentType }) => {
        const result =
          DocumentHelper.retrieveDocumentTypeFromServiceDefinition(identifier);
        expect(result).toBe(documentType);
      }
    );
  });

  describe('assertMetadataIsNotMissing', () => {
    it('should throw error when metadata mapping is missing', () => {
      expect(() =>
        DocumentHelper.assertMetadataIsNotMissing(
          ServiceDefinitionIdentifier.Link as ManageableServiceDefinitionIdentifier,
          []
        )
      ).toThrow(UnknownErrorCode.MissingMetadataMapping);
    });

    it('should throw error when integration_type is missing in an integration document', () => {
      expect(() =>
        DocumentHelper.assertMetadataIsNotMissing(
          ServiceDefinitionIdentifier.OpenctiIntegrations,
          [
            {
              key: DocumentMetadataKeyCode.FeedUrl,
              value: 'https://example.com',
            },
          ]
        )
      ).toThrowError(ErrorCode.DocumentMissingMetadata);
    });

    it('should throw error when integration_type is not recognized', () => {
      expect(() =>
        DocumentHelper.assertMetadataIsNotMissing(
          ServiceDefinitionIdentifier.OpenctiIntegrations,
          [{ key: DocumentMetadataKeyCode.IntegrationType, value: 'test' }]
        )
      ).toThrowError(ErrorCode.IntegrationTypeNotRecognized);
    });

    it('should throw error when a metadata key is missing', () => {
      expect(() =>
        DocumentHelper.assertMetadataIsNotMissing(
          ServiceDefinitionIdentifier.OpenctiIntegrations,
          [
            {
              key: DocumentMetadataKeyCode.IntegrationType,
              value: IntegrationType.CsvFeed,
            },
          ]
        )
      ).toThrowError(ErrorCode.DocumentMissingMetadata);
    });

    it('should not throw an error when a metadata key is missing but is optional', () => {
      DocumentHelper.assertMetadataIsNotMissing(
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.ThirdPartyIntegration,
          },
          {
            key: DocumentMetadataKeyCode.VendorUrl,
            value: 'https://example.com',
          },
        ]
      );
    });

    it('should not throw when all metadata keys are present', () => {
      DocumentHelper.assertMetadataIsNotMissing(
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://example.com',
          },
        ]
      );
    });
  });

  describe('loadSeoDocumentWithCountersBySlug', () => {
    it('should throw an error when document is not found', async () => {
      const call = DocumentHelper.loadSeoDocumentWithCountersBySlug(
        OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
        'slug'
      );

      await expect(call).rejects.toThrow(ErrorCode.DocumentNotFound);
    });

    it('should return document when it is found', async () => {
      const slug = 'slug';
      vi.spyOn(TelemetryApp, 'countEventsByDocumentId').mockImplementation(
        async (eventType) => {
          if (eventType === TelemetryEventType.DOWNLOAD) return 5;
          return 12;
        }
      );
      await DocumentDomain.createDocument(
        {
          name: 'name',
          description: 'description',
          short_description: 'short_description',
          slug,
          active: true,
          type: OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
        },
        []
      );

      const result = await DocumentHelper.loadSeoDocumentWithCountersBySlug(
        OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
        slug
      );

      expect(result).toBeDefined();
      expect(result.download_number).toBe(5);
      expect(result.share_number).toBe(12);
    });
  });

  describe('deleteFileFromMinIO', () => {
    const parentDocument = {
      id: 'parent-id',
      minio_name: 'parent-file',
    } as DocumentModel;

    beforeEach(() => {
      vi.spyOn(MinIOClient, 'deleteFile').mockResolvedValue(undefined);
    });

    it('should delete file of parent document', async () => {
      await DocumentHelper.deleteFileFromMinIO([], parentDocument);

      expect(MinIOClient.deleteFile).toHaveBeenCalledWith('parent-file');
      expect(MinIOClient.deleteFile).toHaveBeenCalledTimes(1);
    });

    it('should delete file of parent and children documents', async () => {
      // Given
      const childDocuments = [
        {
          id: '854f57e7-fb3d-4aed-a719-825ec9c0626e',
          minio_name: 'child-file-1',
          use_cases: [],
        } as unknown as Partial<Document>,
        {
          id: '0df534f5-0e38-41ac-a19f-3ac76e3e334d',
          minio_name: 'child-file-2',
          use_cases: [],
        } as unknown as Partial<Document>,
      ];

      // When
      await DocumentHelper.deleteFileFromMinIO(
        childDocuments as Document[],
        parentDocument
      );

      // Then
      expect(MinIOClient.deleteFile).toHaveBeenCalledTimes(3);
    });

    it('should handle empty children array', async () => {
      await DocumentHelper.deleteFileFromMinIO([], parentDocument);

      expect(MinIOClient.deleteFile).toHaveBeenCalledTimes(1);
      expect(MinIOClient.deleteFile).toHaveBeenCalledWith('parent-file');
    });
  });

  describe('assertDocumentFileIsNotMissing', () => {
    it.each`
      title                                      | hasDocument | integrationType
      ${'document file is optional and missing'} | ${false}    | ${IntegrationType.Connector}
      ${'document file is present'}              | ${true}     | ${IntegrationType.CsvFeed}
    `('should not throw when $title', ({ hasDocument, integrationType }) => {
      expect(() =>
        DocumentHelper.assertDocumentFileIsNotMissing({
          hasDocument,
          documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          documentMetadata: [
            {
              key: DocumentMetadataKeyCode.IntegrationType,
              value: integrationType,
            },
          ],
        })
      ).not.toThrow();
    });

    it.each`
      title                                                            | documentMetadata                                                                      | expectedError
      ${'document file is required but missing'}                       | ${[{ key: DocumentMetadataKeyCode.IntegrationType, value: IntegrationType.CsvFeed }]} | ${ErrorCode.DocumentFileMissing}
      ${'integration_type metadata is missing (defaults to required)'} | ${[]}                                                                                 | ${ErrorCode.DocumentFileMissing}
    `('should throw when $title', ({ documentMetadata, expectedError }) => {
      expect(() =>
        DocumentHelper.assertDocumentFileIsNotMissing({
          hasDocument: false,
          documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          documentMetadata,
        })
      ).toThrow(expectedError);
    });
  });

  describe('isDocumentFileRequired', () => {
    it.each`
      documentType                         | integrationType                          | expected
      ${OPENAEV_SCENARIO_DOCUMENT_TYPE}    | ${null}                                  | ${true}
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE} | ${null}                                  | ${true}
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE} | ${IntegrationType.CsvFeed}               | ${true}
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE} | ${IntegrationType.Stream}                | ${true}
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE} | ${IntegrationType.TaxiiFeed}             | ${true}
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE} | ${IntegrationType.Connector}             | ${false}
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE} | ${IntegrationType.ThirdPartyIntegration} | ${false}
    `(
      'it should return $expected when document is $documentType and integration type is $integrationType',
      ({ documentType, integrationType, expected }) => {
        const documentMetadata = integrationType
          ? [
              {
                key: DocumentMetadataKeyCode.IntegrationType,
                value: integrationType,
              },
            ]
          : [];
        const result = DocumentHelper.isDocumentFileRequired({
          documentType,
          documentMetadata,
        });

        expect(result).toBe(expected);
      }
    );
  });
});
