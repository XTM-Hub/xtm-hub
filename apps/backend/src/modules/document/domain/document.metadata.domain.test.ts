import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  DocumentMetadataKeyCode,
  IntegrationType,
} from '../../../__generated__/resolvers-types';
import { DocumentId } from '../../../model/kanel/public/Document';
import { OPENCTI_INTEGRATION_DOCUMENT_TYPE } from '../../shareable-resource/opencti/integration/integration.model';
import { DocumentUploadsHelper } from '../document.uploads.helper';
import { DocumentMetadataDomain } from './document.metadata.domain';

describe('documentMetadataDomain', () => {
  const minioFileMock = {
    minioName: 'minioFile',
    mimeType: 'mimeType',
    fileName: 'filename',
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
      const document = await TestHelper.document.createWholeDocument({
        name: 'myCsvFeed',
        slug: 'my-csv-feed',
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
      });

      const value = await DocumentMetadataDomain.loadMetadataValueByKey(
        document.id,
        DocumentMetadataKeyCode.FeedUrl
      );

      expect(value).toBe('https://example.com/feed');
    });

    it('should return null when the key does not exist for the document', async () => {
      const document = await TestHelper.document.createWholeDocument({
        name: 'myCsvFeed',
        slug: 'my-csv-feed',
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
      });

      const value = await DocumentMetadataDomain.loadMetadataValueByKey(
        document.id,
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
      const document = await TestHelper.document.createWholeDocument({
        name: 'myTaxiiFeed',
        slug: 'my-taxii-feed',
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
      });

      const feedUrl = await DocumentMetadataDomain.loadMetadataValueByKey(
        document.id,
        DocumentMetadataKeyCode.FeedUrl
      );
      const integrationType =
        await DocumentMetadataDomain.loadMetadataValueByKey(
          document.id,
          DocumentMetadataKeyCode.IntegrationType
        );

      expect(feedUrl).toBe('https://example.com/taxii');
      expect(integrationType).toBe(IntegrationType.TaxiiFeed);
    });

    it('should not return the metadata of a different document with the same key', async () => {
      const firstDocument = await TestHelper.document.createWholeDocument({
        name: 'firstCsvFeed',
        slug: 'first-csv-feed',
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
      });

      const secondDocument = await TestHelper.document.createWholeDocument({
        name: 'secondCsvFeed',
        slug: 'second-csv-feed',
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
      });

      const firstValue = await DocumentMetadataDomain.loadMetadataValueByKey(
        firstDocument.id,
        DocumentMetadataKeyCode.FeedUrl
      );
      const secondValue = await DocumentMetadataDomain.loadMetadataValueByKey(
        secondDocument.id,
        DocumentMetadataKeyCode.FeedUrl
      );

      expect(firstValue).toBe('https://first.example.com/feed');
      expect(secondValue).toBe('https://second.example.com/feed');
    });
  });
});
