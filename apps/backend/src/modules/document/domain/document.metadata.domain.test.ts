import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import {
  DocumentMetadataKeyCode,
  DocumentStatus,
  IntegrationType,
} from '../../../__generated__/resolvers-types';
import { DocumentId } from '../../../model/kanel/public/Document';
import {
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../../shareable-resource/opencti/integration/integration.model';
import { DocumentApp } from '../document.app';
import { DocumentUploadsHelper } from '../document.uploads.helper';
import { DocumentMetadataDomain } from './document.metadata.domain';

describe('documentMetadataDomain', () => {
  const minioFileMock = {
    minioName: 'minioFile',
    mimeType: 'mimeType',
    fileName: 'filename',
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

  beforeEach(async () => {
    vi.spyOn(DocumentUploadsHelper, 'processUploads').mockImplementation(
      async () => [minioFileMock]
    );
    await TestHelper.document.delete({
      type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
    });
  });

  describe('loadMetadataValueByKey', () => {
    it('should return the value when the metadata key exists', async () => {
      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myCsvFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'my-csv-feed',
          status: DocumentStatus.Published,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://example.com/feed',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });

      const value = await DocumentMetadataDomain.loadMetadataValueByKey(
        document!.id,
        DocumentMetadataKeyCode.FeedUrl
      );

      expect(value).toBe('https://example.com/feed');
    });

    it('should return null when the key does not exist for the document', async () => {
      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myCsvFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'my-csv-feed',
          status: DocumentStatus.Published,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://example.com/feed',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });

      const value = await DocumentMetadataDomain.loadMetadataValueByKey(
        document!.id,
        'non_existent_key'
      );

      expect(value).toBeNull();
    });

    it('should return null when no document matches the given id', async () => {
      const value = await DocumentMetadataDomain.loadMetadataValueByKey(
        '00000000-0000-0000-0000-000000000000' as DocumentId,
        DocumentMetadataKeyCode.FeedUrl
      );

      expect(value).toBeNull();
    });

    it('should return the correct value among multiple metadata keys', async () => {
      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myTaxiiFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'my-taxii-feed',
          status: DocumentStatus.Published,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.TaxiiFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://example.com/taxii',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });

      const feedUrl = await DocumentMetadataDomain.loadMetadataValueByKey(
        document!.id,
        DocumentMetadataKeyCode.FeedUrl
      );
      const integrationType =
        await DocumentMetadataDomain.loadMetadataValueByKey(
          document!.id,
          DocumentMetadataKeyCode.IntegrationType
        );

      expect(feedUrl).toBe('https://example.com/taxii');
      expect(integrationType).toBe(IntegrationType.TaxiiFeed);
    });

    it('should not return the metadata of a different document with the same key', async () => {
      const firstDocument = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'firstCsvFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'first-csv-feed',
          status: DocumentStatus.Published,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://first.example.com/feed',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });

      const secondDocument = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'secondCsvFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'second-csv-feed',
          status: DocumentStatus.Published,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://second.example.com/feed',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });

      const firstValue = await DocumentMetadataDomain.loadMetadataValueByKey(
        firstDocument!.id,
        DocumentMetadataKeyCode.FeedUrl
      );
      const secondValue = await DocumentMetadataDomain.loadMetadataValueByKey(
        secondDocument!.id,
        DocumentMetadataKeyCode.FeedUrl
      );

      expect(firstValue).toBe('https://first.example.com/feed');
      expect(secondValue).toBe('https://second.example.com/feed');
    });
  });
});
