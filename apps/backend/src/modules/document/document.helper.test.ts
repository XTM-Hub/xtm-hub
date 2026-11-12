import config from 'config';
import { toGlobalId } from 'graphql-relay/node/node.js';
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
  DocumentStatus,
  IntegrationType,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import {
  DocumentId,
  default as DocumentModel,
} from '../../model/kanel/public/Document';
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
          status: DocumentStatus.Published,
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

  describe('assertStatusTransition', () => {
    it.each`
      from                           | to
      ${DocumentStatus.Draft}        | ${DocumentStatus.InValidation}
      ${DocumentStatus.Draft}        | ${DocumentStatus.Published}
      ${DocumentStatus.InValidation} | ${DocumentStatus.Published}
      ${DocumentStatus.Published}    | ${DocumentStatus.Draft}
      ${DocumentStatus.Draft}        | ${DocumentStatus.Draft}
      ${DocumentStatus.InValidation} | ${DocumentStatus.InValidation}
      ${DocumentStatus.Published}    | ${DocumentStatus.Published}
    `(
      'should accept the transition when the status goes from $from to $to',
      ({ from, to }: { from: DocumentStatus; to: DocumentStatus }) => {
        // Given a document in the "from" status

        // When
        const transition = () =>
          DocumentHelper.assertStatusTransition(from, to);

        // Then
        expect(transition).not.toThrow();
      }
    );

    it.each`
      from                           | to
      ${DocumentStatus.InValidation} | ${DocumentStatus.Draft}
      ${DocumentStatus.Published}    | ${DocumentStatus.InValidation}
    `(
      'should reject the transition when the status goes from $from to $to',
      ({ from, to }: { from: DocumentStatus; to: DocumentStatus }) => {
        // Given a document in the "from" status

        // When
        const transition = () =>
          DocumentHelper.assertStatusTransition(from, to);

        // Then
        expect(transition).toThrow(ErrorCode.InvalidDocumentStatusTransition);
      }
    );
  });

  describe('buildInValidationPayload', () => {
    const DOCUMENT_ID = '5a9b1f0e-2d6c-4b8e-9f3a-7c1d2e4f6a8b' as DocumentId;
    const DOCUMENT_NAME = 'My resource';
    const SHORT_DESCRIPTION = 'A short description. And a second sentence.';
    const AUTHOR_EMAIL = 'author@filigran.io';
    const SERVICE_DEFINITION = TestHelper.serviceDefinition.build();

    const buildPayload = ({
      type = OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      integrationType = null,
      authorEmail = AUTHOR_EMAIL,
      name = DOCUMENT_NAME,
      shortDescription = SHORT_DESCRIPTION,
    }: {
      type?: string;
      integrationType?: IntegrationType | null;
      authorEmail?: string | null;
      name?: string | null;
      shortDescription?: string | null;
    } = {}) =>
      DocumentHelper.buildInValidationPayload({
        document: TestHelper.document.build({
          id: DOCUMENT_ID,
          name,
          short_description: shortDescription,
          type,
        }),
        serviceDefinition: SERVICE_DEFINITION,
        integrationType,
        authorEmail,
      });

    it.each`
      integrationType                          | label
      ${IntegrationType.Connector}             | ${'Connector'}
      ${IntegrationType.CsvFeed}               | ${'CSV Feed'}
      ${IntegrationType.RssFeed}               | ${'RSS Feed'}
      ${IntegrationType.Stream}                | ${'Stream'}
      ${IntegrationType.TaxiiFeed}             | ${'TAXII Feed'}
      ${IntegrationType.ThirdPartyIntegration} | ${'Third party integration'}
    `(
      'should label the resource type $label when the integration type is $integrationType',
      ({
        integrationType,
        label,
      }: {
        integrationType: IntegrationType;
        label: string;
      }) => {
        // Given an integration document of the given integration type

        // When
        const payload = buildPayload({
          type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          integrationType,
        });

        // Then
        expect(payload.resource.type).toBe(label);
      }
    );

    it('should have no resource type when the document is not an integration', () => {
      // Given a custom dashboard document, whose library already says what it is

      // When
      const payload = buildPayload({
        type: OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
      });

      // Then
      expect(payload.resource.type).toBeNull();
    });

    it('should build the payload with the library, the resource and a link to the document', () => {
      // Given an integration document in validation

      // When
      const payload = buildPayload({
        integrationType: IntegrationType.CsvFeed,
      });

      // Then
      expect(payload).toEqual({
        library: SERVICE_DEFINITION.name,
        resource: {
          name: DOCUMENT_NAME,
          type: 'CSV Feed',
          status: DocumentStatus.InValidation,
          short_description: SHORT_DESCRIPTION,
          link: `${config.get<string>('base_url_front')}/redirect/${SERVICE_DEFINITION.identifier}?document_id=${toGlobalId('Document', DOCUMENT_ID)}`,
          author_email: AUTHOR_EMAIL,
        },
      });
    });

    it('should keep null fields as null when the document has no name, no short description and no author', () => {
      // Given a document without name, short description and author

      // When
      const payload = buildPayload({
        name: null,
        shortDescription: null,
        authorEmail: null,
      });

      // Then
      expect(payload.resource).toMatchObject({
        name: null,
        short_description: null,
        author_email: null,
      });
    });
  });

  describe('toIntegrationType', () => {
    it.each`
      documentType                              | value                        | expected
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE}      | ${IntegrationType.CsvFeed}   | ${IntegrationType.CsvFeed}
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE}      | ${'not_an_integration_type'} | ${null}
      ${OPENCTI_INTEGRATION_DOCUMENT_TYPE}      | ${null}                      | ${null}
      ${OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE} | ${IntegrationType.CsvFeed}   | ${null}
    `(
      'should return $expected when the document type is $documentType and the metadata value is $value',
      ({
        documentType,
        value,
        expected,
      }: {
        documentType: string;
        value: string | null;
        expected: IntegrationType | null;
      }) => {
        // Given a document type and an integration type metadata value

        // When
        const integrationType = DocumentHelper.toIntegrationType(
          documentType,
          value
        );

        // Then
        expect(integrationType).toBe(expected);
      }
    );
  });

  describe('buildNotPublishedPayload', () => {
    const DRAFT_ID = '5a9b1f0e-2d6c-4b8e-9f3a-7c1d2e4f6a8b' as DocumentId;
    const IN_VALIDATION_ID =
      '8c2d4e6f-1a3b-4c5d-8e7f-9a0b1c2d3e4f' as DocumentId;
    const SERVICE_DEFINITION = TestHelper.serviceDefinition.build();
    const linkOf = (id: DocumentId) =>
      `${config.get<string>('base_url_front')}/redirect/${SERVICE_DEFINITION.identifier}?document_id=${toGlobalId('Document', id)}`;

    it('should build one resource per document with its own status, type label, link and author', () => {
      // Given a draft integration and an in validation custom dashboard of the same library
      const draft = TestHelper.document.build({
        id: DRAFT_ID,
        name: 'Draft feed',
        short_description: 'Draft description',
        status: DocumentStatus.Draft,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      });
      const inValidation = TestHelper.document.build({
        id: IN_VALIDATION_ID,
        name: 'Dashboard in validation',
        short_description: null,
        status: DocumentStatus.InValidation,
        type: OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
      });

      // When
      const payload = DocumentHelper.buildNotPublishedPayload({
        serviceDefinition: SERVICE_DEFINITION,
        resources: [
          {
            document: draft,
            integrationType: IntegrationType.CsvFeed,
            authorEmail: 'author@filigran.io',
          },
          { document: inValidation, integrationType: null, authorEmail: null },
        ],
      });

      // Then
      expect(payload).toEqual({
        library: SERVICE_DEFINITION.name,
        resources: [
          {
            name: 'Draft feed',
            type: 'CSV Feed',
            status: 'draft',
            short_description: 'Draft description',
            link: linkOf(DRAFT_ID),
            author_email: 'author@filigran.io',
          },
          {
            name: 'Dashboard in validation',
            type: null,
            status: 'in_validation',
            short_description: null,
            link: linkOf(IN_VALIDATION_ID),
            author_email: null,
          },
        ],
      });
    });
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
          status: DocumentStatus.Published,
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

  describe('deleteObsoleteFiles', () => {
    it('should delete every given file', async () => {
      // Given
      vi.spyOn(MinIOClient, 'deleteFile').mockResolvedValue(undefined);

      // When
      await DocumentHelper.deleteObsoleteFiles(['file-1', 'file-2']);

      // Then
      expect(MinIOClient.deleteFile).toHaveBeenCalledTimes(2);
      expect(MinIOClient.deleteFile).toHaveBeenCalledWith('file-1');
      expect(MinIOClient.deleteFile).toHaveBeenCalledWith('file-2');
    });

    it('should not call the storage when there is no file', async () => {
      // Given
      vi.spyOn(MinIOClient, 'deleteFile').mockResolvedValue(undefined);

      // When
      await DocumentHelper.deleteObsoleteFiles([]);

      // Then
      expect(MinIOClient.deleteFile).not.toHaveBeenCalled();
    });

    it('should not throw and still delete the other files when one deletion fails', async () => {
      // Given
      vi.spyOn(MinIOClient, 'deleteFile')
        .mockRejectedValueOnce(new Error('storage down'))
        .mockResolvedValue(undefined);

      // When
      await expect(
        DocumentHelper.deleteObsoleteFiles(['file-1', 'file-2'])
      ).resolves.toBeUndefined();

      // Then
      expect(MinIOClient.deleteFile).toHaveBeenCalledTimes(2);
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
