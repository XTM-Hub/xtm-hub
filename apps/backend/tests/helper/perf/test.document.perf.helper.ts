import { v4 as uuidv4 } from 'uuid';
import {
  DocumentMetadataKeyCode,
  DocumentStatus,
} from '../../../src/__generated__/resolvers-types';
import { DocumentId } from '../../../src/model/kanel/public/Document';
import type { DocumentMetadataKey } from '../../../src/model/kanel/public/DocumentMetadata';
import { ServiceInstanceId } from '../../../src/model/kanel/public/ServiceInstance';
import { TEST_ORGANIZATIONS } from '../../tests.const';
import { TestDocumentHelper } from '../test.document.helper';

// Converts a plain string to the branded DocumentMetadataKey type
const toMetaKey = (key: string): DocumentMetadataKey =>
  key as unknown as DocumentMetadataKey;

export interface SeedDocumentsOpts {
  /** Run-unique prefix used in slugs to avoid cross-run collisions. */
  runPrefix: string;
  /** ServiceInstance ID to attach documents to. */
  serviceInstanceId: ServiceInstanceId;
  /** Document type (e.g. OPENCTI_INTEGRATION_DOCUMENT_TYPE). */
  documentType: string;
  /** Prefix used in document `name` field (enables name-based search tests). */
  namePrefix?: string;
  /** How many of the seeded docs have `manager_supported = 'true'`. */
  managerSupportedCount?: number;
  /** Short tag appended to slugs to avoid conflicts between groups. */
  groupTag?: string;
  /** Which metadata inserter to use for this document type. */
  metadataVariant: 'integration' | 'scenario' | 'dashboard';
}

export interface SeedDocumentsResult {
  documentIds: DocumentId[];
  imageDocumentIds: DocumentId[];
}

/**
 * Inserts `count` active documents with full metadata using TestHelper.
 * Documents are created in parallel batches of 50 to keep setup time short.
 * Returns the IDs of every inserted document and its associated image child,
 * so callers can track them for teardown.
 */
export async function seedDocuments(
  count: number,
  opts: SeedDocumentsOpts
): Promise<SeedDocumentsResult> {
  const {
    runPrefix,
    serviceInstanceId,
    documentType,
    namePrefix = 'perf-doc',
    managerSupportedCount = 0,
    groupTag = uuidv4().slice(0, 6),
    metadataVariant,
  } = opts;

  const documentIds: DocumentId[] = [];
  const imageDocumentIds: DocumentId[] = [];
  const BATCH_SIZE = 50;

  for (let batchStart = 0; batchStart < count; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
    const batchIndices = Array.from(
      { length: batchEnd - batchStart },
      (_, i) => batchStart + i
    );

    const docs = await Promise.all(
      batchIndices.map((i) =>
        TestDocumentHelper.document.create({
          type: documentType,
          service_instance_id: serviceInstanceId,
          status: DocumentStatus.Published,
          slug: `${runPrefix}-${groupTag}-${i}`,
          name: `${namePrefix}-${i}`,
          description: `Performance test document group=${groupTag}`,
          short_description: 'perf test',
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        })
      )
    );

    await Promise.all(
      docs.flatMap((doc, localI) => {
        const globalI = batchStart + localI;
        const isSupported = globalI < managerSupportedCount;
        const minorVersion = globalI % 3;
        const productVersion = `5.${minorVersion}.${globalI % 10}`;

        if (metadataVariant === 'integration') {
          return [
            // --- type ---
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.IntegrationType),
              value: 'connector',
            }),
            // --- version ---
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.ProductVersion),
              value: productVersion,
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.MinimumDeployableVersion),
              value: '5.0.0',
            }),
            // --- container / source ---
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.ContainerImage),
              value: `opencti/connector-perf-${groupTag}:${productVersion}`,
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.SourceCode),
              value: `https://github.com/OpenCTI-Platform/connectors/perf-${groupTag}-${globalI}`,
            }),
            // --- boolean flags ---
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.Verified),
              value: globalI % 4 === 0 ? 'false' : 'true',
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.ManagerSupported),
              value: isSupported ? 'true' : 'false',
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.PlaybookSupported),
              value: globalI % 3 === 0 ? 'true' : 'false',
            }),
            // --- URLs ---
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.SubscriptionLink),
              value: `https://filigran.io/subscription/perf-${groupTag}-${globalI}`,
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.DatasheetUrl),
              value: `https://filigran.io/datasheet/perf-${groupTag}-${globalI}.pdf`,
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.BlogpostUrl),
              value: `https://blog.filigran.io/perf-${groupTag}-${globalI}`,
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.DemoUrl),
              value: `https://demo.filigran.io/perf-${groupTag}-${globalI}`,
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.VendorUrl),
              value: `https://vendor.example.com/perf-${groupTag}-${globalI}`,
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.GithubUrl),
              value: `https://github.com/vendor/perf-${groupTag}-${globalI}`,
            }),
            TestDocumentHelper.documentMetadata.create({
              document_id: doc.id,
              key: toMetaKey(DocumentMetadataKeyCode.FeedUrl),
              value: `https://feed.example.com/perf-${groupTag}-${globalI}`,
            }),
          ];
        }

        // scenario + dashboard share the same metadata shape: only product_version
        return [
          TestDocumentHelper.documentMetadata.create({
            document_id: doc.id,
            key: toMetaKey(DocumentMetadataKeyCode.ProductVersion),
            value: productVersion,
          }),
        ];
      })
    );

    documentIds.push(...docs.map((d) => d.id));

    // Create one image child document per parent to simulate real data shape.
    // These are filtered OUT of query results by the NOT EXISTS clause but
    // they exercise the Document_Children and Document_Metadata table sizes.
    const imageDocuments = await Promise.all(
      docs.map((parentDoc) =>
        TestDocumentHelper.document.create({
          type: 'image',
          service_instance_id: serviceInstanceId,
          status: DocumentStatus.Published,
          slug: `${runPrefix}-${groupTag}-img-${parentDoc.id.slice(0, 8)}`,
          name: `img-${parentDoc.id.slice(0, 8)}`,
          mime_type: 'image/png',
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        })
      )
    );

    // Link each image to its parent via Document_Children
    await Promise.all(
      imageDocuments.map((imgDoc, idx) =>
        TestDocumentHelper.documentChildren.create({
          parent_document_id: docs[idx]!.id,
          child_document_id: imgDoc.id,
        })
      )
    );

    imageDocumentIds.push(...imageDocuments.map((d) => d.id));
  }

  return { documentIds, imageDocumentIds };
}
