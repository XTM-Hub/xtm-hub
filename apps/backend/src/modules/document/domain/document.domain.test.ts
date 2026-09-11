import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  DocumentConnection,
  DocumentMetadataKeyCode,
  DocumentOrdering,
  FilterKey,
  Integration,
  IntegrationType,
  LogicalOperator,
  OrderingMode,
} from '../../../__generated__/resolvers-types';
import type { DocumentMetadataKey } from '../../../model/kanel/public/DocumentMetadata';
import {
  TAG_DECOUPLING,
  TAG_LATEST,
  TAG_LATEST_LTS,
} from '../../shareable-resource/manifest-fragment/manifest-fragment.helper';
import { OPENAEV_SCENARIO_DOCUMENT_TYPE } from '../../shareable-resource/openaev/scenario/scenario.model';
import { OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE } from '../../shareable-resource/opencti/custom-view/custom-view.model';
import { IngestManifestDomain } from '../../shareable-resource/opencti/integration/ingest-manifest/ingest-manifest.domain';
import { ManifestInformation } from '../../shareable-resource/opencti/integration/ingest-manifest/ingest-manifest.model';
import sampleExtractedManifest from '../../shareable-resource/opencti/integration/ingest-manifest/test/sample-extracted-manifest.json';
import {
  Connector,
  INTEGRATION_CONNECTOR_METADATA_KEYS,
  INTEGRATION_METADATA_KEYS,
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../../shareable-resource/opencti/integration/integration.model';

import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  requestContextRegistererUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { requestContext } from '../../../context/request.context';
import Document from '../../../model/kanel/public/Document';
import { ObjectUseCaseObjectId } from '../../../model/kanel/public/ObjectUseCase';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { UseCaseId } from '../../../model/kanel/public/UseCase';
import {
  ADMIN_UUID,
  PLATFORM_ORGANIZATION_UUID,
  SYSTEM_USER_UUID,
} from '../../../portal.const';
import { isFeatureEnabled } from '../../../utils/feature-flag.util';
import { DocumentUploadsHelper } from '../document.uploads.helper';
import { DocumentDomain } from './document.domain';

// isFeatureEnabled is mocked (defaulting to disabled) so that tests are deterministic and
// independent of the local `enabled_features` config (which may enable everything, e.g. via a
// wildcard in a developer's local.json).
vi.mock('../../../utils/feature-flag.util', () => ({
  isFeatureEnabled: vi.fn(() => false),
}));

describe('document domain', () => {
  const minioFileMock = {
    minioName: 'minioFile',
    mimeType: 'mimeType',
    fileName: 'filename',
  };

  beforeEach(async () => {
    vi.spyOn(DocumentUploadsHelper, 'processUploads').mockResolvedValue([
      minioFileMock,
    ]);
    await TestHelper.document.delete({});
  });

  describe('deactivateDocuments', () => {
    let createdDocument: Document;
    beforeEach(async () => {
      createdDocument = await TestHelper.document.createWholeDocument({});
    });

    it('should do nothing when the document ids is an empty array', async () => {
      await DocumentDomain.deactivateDocuments([]);

      const document = await TestHelper.document.load({
        id: createdDocument.id,
      });

      expect(document).toMatchObject({
        active: true,
      });
    });

    it('should deactivate document and set remover id', async () => {
      await DocumentDomain.deactivateDocuments([createdDocument.id]);

      const document = await TestHelper.document.load({
        id: createdDocument.id,
      });

      expect(document).toMatchObject({
        active: false,
        remover_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
    });
  });

  describe('reassignUserDocumentsToSystemUser', () => {
    it('should reassign every user reference of the documents to the system user', async () => {
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;
      const uploaded = await DocumentDomain.createDocument(
        {
          name: 'reassign-uploaded',
          slug: 'reassign-uploaded',
          type: 'test-type',
          uploader_id: userId,
          uploader_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
        []
      );
      const touched = await DocumentDomain.createDocument(
        {
          name: 'reassign-touched',
          slug: 'reassign-touched',
          type: 'test-type',
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          remover_id: userId,
          updater_id: userId,
        },
        []
      );

      await DocumentDomain.reassignUserDocumentsToSystemUser(userId);

      expect(await TestHelper.document.load({ id: uploaded.id })).toMatchObject(
        {
          uploader_id: SYSTEM_USER_UUID,
          uploader_organization_id: PLATFORM_ORGANIZATION_UUID,
        }
      );
      expect(await TestHelper.document.load({ id: touched.id })).toMatchObject({
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        remover_id: SYSTEM_USER_UUID,
        updater_id: SYSTEM_USER_UUID,
      });
    });

    it('should leave documents of other users untouched', async () => {
      const otherDocument = await DocumentDomain.createDocument(
        {
          name: 'reassign-other',
          slug: 'reassign-other',
          type: 'test-type',
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        },
        []
      );

      await DocumentDomain.reassignUserDocumentsToSystemUser(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID
      );

      expect(
        await TestHelper.document.load({ id: otherDocument.id })
      ).toMatchObject({
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });
    });
  });

  describe(`loadParentDocumentsByServiceInstance`, () => {
    let csvFeed: Document;
    beforeEach(async () => {
      await TestHelper.document.delete({
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      });

      csvFeed = await TestHelper.document.createWholeDocument({});
    });

    it('should return CSV Feeds along with connectors when fetching integration feeds', async () => {
      await IngestManifestDomain.upsertConnectors([
        sampleExtractedManifest[0],
      ] as ManifestInformation[]);

      const connection: { edges: { node: Integration }[] } =
        await DocumentDomain.loadParentDocumentsByServiceInstance(
          OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          {
            orderBy: DocumentOrdering.CreatedAt,
            orderMode: OrderingMode.Desc,
            first: 10,
            serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
          },
          INTEGRATION_METADATA_KEYS
        );

      const csvFeeds = connection.edges
        .filter(
          (feed) => feed.node.integration_type === IntegrationType.CsvFeed
        )
        .map((feed) => feed.node);
      expect(csvFeeds.length).toBeTruthy();

      const connectors = connection.edges.filter(
        (feed) => feed.node.integration_type === IntegrationType.Connector
      );

      expect(connectors.length).toBeTruthy();
      const connector: Connector = connectors[0]?.node as Connector;
      INTEGRATION_CONNECTOR_METADATA_KEYS.forEach((metadata) => {
        expect(connector[metadata]).toBeDefined();
      });
    });

    it('should filter an integration feed with a metadata type', async () => {
      const [connector] = await IngestManifestDomain.upsertConnectors([
        sampleExtractedManifest[0],
      ] as ManifestInformation[]);

      expect(connector).toBeDefined();

      // Fetch csv feeds only
      const csvFeedConnection: { edges: { node: Integration }[] } =
        await DocumentDomain.loadParentDocumentsByServiceInstance(
          OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          {
            orderBy: DocumentOrdering.CreatedAt,
            orderMode: OrderingMode.Desc,
            first: 10,
            serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
            logicalFilters: {
              operator: LogicalOperator.And,
              children: [
                {
                  leaf: {
                    key: FilterKey.IntegrationType,
                    value: [IntegrationType.CsvFeed],
                  },
                },
              ],
            },
          },
          INTEGRATION_METADATA_KEYS
        );

      expect(csvFeedConnection.edges).toHaveLength(1);
      expect(csvFeedConnection.edges[0]?.node.id).toBe(csvFeed!.id);
      expect(csvFeedConnection.edges[0]?.node.integration_type).toBe(
        IntegrationType.CsvFeed
      );

      // Fetch connectors only
      const connectorConnection: { edges: { node: Integration }[] } =
        await DocumentDomain.loadParentDocumentsByServiceInstance(
          OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          {
            orderBy: DocumentOrdering.CreatedAt,
            orderMode: OrderingMode.Desc,
            first: 10,
            serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
            logicalFilters: {
              operator: LogicalOperator.And,
              children: [
                {
                  leaf: {
                    key: FilterKey.IntegrationType,
                    value: [IntegrationType.Connector],
                  },
                },
              ],
            },
          },
          INTEGRATION_METADATA_KEYS
        );

      expect(connectorConnection.edges).toHaveLength(1);
      expect(connectorConnection.edges[0]?.node).toMatchObject({
        id: connector?.id,
        integration_type: IntegrationType.Connector,
      });

      // fetch both
      const integrationConnection: DocumentConnection =
        await DocumentDomain.loadParentDocumentsByServiceInstance(
          OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          {
            orderBy: DocumentOrdering.CreatedAt,
            orderMode: OrderingMode.Desc,
            first: 10,
            serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
            logicalFilters: {
              operator: LogicalOperator.And,
              children: [
                {
                  leaf: {
                    key: FilterKey.IntegrationType,
                    value: [IntegrationType.Connector, IntegrationType.CsvFeed],
                  },
                },
              ],
            },
          },
          INTEGRATION_METADATA_KEYS
        );

      expect(integrationConnection.edges).toHaveLength(2);
    });

    describe('multiple filters', () => {
      it('should handle type and version', async () => {
        const connectors = await IngestManifestDomain.upsertConnectors(
          sampleExtractedManifest as ManifestInformation[]
        );

        expect(connectors).toHaveLength(2);

        // Fetch connectors with version
        const connectorConnection: { edges: { node: Integration }[] } =
          await DocumentDomain.loadParentDocumentsByServiceInstance(
            OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            {
              orderBy: DocumentOrdering.CreatedAt,
              orderMode: OrderingMode.Desc,
              first: 10,
              serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
              logicalFilters: {
                operator: LogicalOperator.And,
                children: [
                  {
                    leaf: {
                      key: FilterKey.IntegrationType,
                      value: [IntegrationType.Connector],
                    },
                  },
                  {
                    leaf: {
                      key: FilterKey.ProductVersion,
                      value: ['1.0.0'],
                    },
                  },
                ],
              },
            },
            INTEGRATION_METADATA_KEYS
          );

        expect(connectorConnection.edges).toHaveLength(1);
        expect(connectorConnection.edges[0]?.node).toMatchObject({
          id: connectors[0]?.id,
          integration_type: IntegrationType.Connector,
        });
      });

      it('should handle type', async () => {
        const connectors = await IngestManifestDomain.upsertConnectors(
          sampleExtractedManifest as ManifestInformation[]
        );

        expect(connectors).toHaveLength(2);

        // Fetch connectors with version
        const connectorConnection: DocumentConnection =
          await DocumentDomain.loadParentDocumentsByServiceInstance(
            OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            {
              orderBy: DocumentOrdering.CreatedAt,
              orderMode: OrderingMode.Desc,
              first: 10,
              serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
              logicalFilters: {
                operator: LogicalOperator.Or,
                children: [
                  {
                    operator: LogicalOperator.And,
                    children: [
                      {
                        leaf: {
                          key: FilterKey.IntegrationType,
                          value: [IntegrationType.Connector],
                        },
                      },
                    ],
                  },
                  {
                    leaf: {
                      key: FilterKey.IntegrationType,
                      value: [IntegrationType.CsvFeed],
                    },
                  },
                ],
              },
            },
            INTEGRATION_METADATA_KEYS
          );

        expect(connectorConnection.edges).toHaveLength(3);

        expect(connectorConnection.edges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              node: expect.objectContaining({
                integration_type: IntegrationType.CsvFeed,
              }),
            }),
            expect.objectContaining({
              node: expect.objectContaining({
                integration_type: IntegrationType.Connector,
              }),
            }),
          ])
        );
      });
    });

    describe('decoupling connectors feature flag', () => {
      beforeEach(() => {
        vi.mocked(isFeatureEnabled).mockReturnValue(true);
      });

      afterEach(() => {
        vi.mocked(isFeatureEnabled).mockReturnValue(false);
      });

      let connectorSlugCounter = 0;
      const createConnector = async (tags: string[]): Promise<Document> => {
        connectorSlugCounter += 1;
        const doc = await TestHelper.document.create({
          type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
          slug: `decoupling-connector-${connectorSlugCounter}`,
          active: true,
          tags,
        });
        await TestHelper.documentMetadata.create({
          document_id: doc.id,
          key: DocumentMetadataKeyCode.IntegrationType as unknown as DocumentMetadataKey,
          value: IntegrationType.Connector,
        });
        return doc;
      };

      it('should only return connectors tagged with both latest and decoupling when the flag is enabled, leaving other integration types untouched', async () => {
        const latestDecoupledConnector = await createConnector([
          TAG_LATEST,
          TAG_DECOUPLING,
        ]);
        const decoupledOnlyConnector = await createConnector([TAG_DECOUPLING]);
        const legacyConnector = await createConnector([]);

        const connection =
          await DocumentDomain.loadParentDocumentsByServiceInstance(
            OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            {
              orderBy: DocumentOrdering.CreatedAt,
              orderMode: OrderingMode.Desc,
              first: 10,
              serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
            },
            INTEGRATION_METADATA_KEYS
          );

        const ids = connection.edges.map((edge) => edge.node.id);
        expect(ids).toContain(latestDecoupledConnector.id);
        expect(ids).not.toContain(decoupledOnlyConnector.id);
        expect(ids).not.toContain(legacyConnector.id);
        // Non-connector integration types are unaffected by the flag.
        expect(ids).toContain(csvFeed.id);
      });
    });

    describe('product version filtering', () => {
      it('should filter an integration feed with a product version', async () => {
        // Create data
        const connectors = await IngestManifestDomain.upsertConnectors(
          sampleExtractedManifest as ManifestInformation[]
        );

        expect(connectors).toBeDefined();
        expect(connectors).toHaveLength(2);

        const secondContractConnection: DocumentConnection =
          await DocumentDomain.loadParentDocumentsByServiceInstance(
            OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            {
              orderBy: DocumentOrdering.CreatedAt,
              orderMode: OrderingMode.Desc,
              first: 10,
              serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
              logicalFilters: {
                operator: LogicalOperator.And,
                children: [
                  {
                    leaf: {
                      key: FilterKey.ProductVersion,
                      value: ['1.0.0'],
                    },
                  },
                ],
              },
            },
            INTEGRATION_METADATA_KEYS
          );

        expect(secondContractConnection.edges).toHaveLength(2);
        expect(secondContractConnection.edges[0]?.node.id).toBe(
          connectors[0]?.id
        );
      });

      it('should handle multiple product version filters', async () => {
        // Create data
        const connectors = await IngestManifestDomain.upsertConnectors(
          sampleExtractedManifest as ManifestInformation[]
        );

        expect(connectors).toBeDefined();
        expect(connectors).toHaveLength(2);

        const allContractsConnection: DocumentConnection =
          await DocumentDomain.loadParentDocumentsByServiceInstance(
            OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            {
              orderBy: DocumentOrdering.CreatedAt,
              orderMode: OrderingMode.Desc,
              first: 10,
              serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
              logicalFilters: {
                operator: LogicalOperator.And,
                children: [
                  {
                    leaf: {
                      key: FilterKey.ProductVersion,
                      value: ['1.0.54', '1.0.1'],
                    },
                  },
                ],
              },
            },
            INTEGRATION_METADATA_KEYS
          );

        expect(allContractsConnection.edges).toHaveLength(3);
      });
    });

    describe('entity type filtering', () => {
      const CUSTOM_VIEW_SERVICE_INSTANCE_ID =
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID;

      const createCustomViewWithEntityTypes = async (
        name: string,
        entityTypes: string[]
      ): Promise<Document> => {
        const document = await TestHelper.document.create({
          name,
          type: OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
          service_instance_id: CUSTOM_VIEW_SERVICE_INSTANCE_ID,
          active: true,
        });
        await TestHelper.documentMetadata.create({
          document_id: document.id,
          key: DocumentMetadataKeyCode.EntityTypes as DocumentMetadataKey,
          value: JSON.stringify(entityTypes),
        });
        return document;
      };

      const loadCustomViewsFilteredByEntityTypes = (entityTypes: string[]) =>
        DocumentDomain.loadParentDocumentsByServiceInstance(
          OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
          {
            orderBy: DocumentOrdering.CreatedAt,
            orderMode: OrderingMode.Desc,
            first: 10,
            serviceInstanceId: CUSTOM_VIEW_SERVICE_INSTANCE_ID,
            logicalFilters: {
              operator: LogicalOperator.And,
              children: [
                {
                  leaf: {
                    key: FilterKey.EntityType,
                    value: entityTypes,
                  },
                },
              ],
            },
          },
          [DocumentMetadataKeyCode.EntityTypes]
        );

      beforeEach(async () => {
        await TestHelper.document.delete({
          type: OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        });
      });

      it('should filter custom views by a single entity type', async () => {
        const malwareReport = await createCustomViewWithEntityTypes(
          'malware-report',
          ['Malware', 'Report']
        );
        await createCustomViewWithEntityTypes('report-only', ['Report']);

        const connection = await loadCustomViewsFilteredByEntityTypes([
          'Malware',
        ]);

        expect(connection.edges).toHaveLength(1);
        expect(connection.edges[0]?.node.id).toBe(malwareReport.id);
      });

      it('should return every custom view sharing a selected entity type', async () => {
        await createCustomViewWithEntityTypes('malware-report', [
          'Malware',
          'Report',
        ]);
        await createCustomViewWithEntityTypes('report-only', ['Report']);

        const connection = await loadCustomViewsFilteredByEntityTypes([
          'Report',
        ]);

        expect(connection.edges).toHaveLength(2);
      });

      it('should return no custom views when none match the selected entity type', async () => {
        await createCustomViewWithEntityTypes('malware-report', [
          'Malware',
          'Report',
        ]);

        const connection = await loadCustomViewsFilteredByEntityTypes(['Tool']);

        expect(connection.edges).toHaveLength(0);
      });
    });
  });

  describe('createDocument', () => {
    it.each`
      typeOfDocument      | overwriteField                                                   | expected
      ${'minimal fields'} | ${{}}                                                            | ${{}}
      ${'uploader id'}    | ${{ uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID }} | ${{ uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID }}
      ${'inactive'}       | ${{ active: false }}                                             | ${{ active: false }}
    `(
      'it should create a document with $typeOfDocument',
      async ({ typeOfDocument, overwriteField, expected }) => {
        // Given
        const docData = {
          name: typeOfDocument,
          slug: typeOfDocument.toLowerCase().replace(/\s/g, '-'),
          type: 'test-type',
          ...overwriteField,
        };

        // When
        const document = await DocumentDomain.createDocument(docData, []);
        const dbDocument = await TestHelper.document.load({
          id: document!.id,
        });

        // Then
        const baseExpected = {
          name: docData.name,
          type: docData.type,
          slug: docData.slug,
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          active: true,
        };

        const expectedDocument = {
          ...baseExpected,
          ...expected,
        };
        expect(document).toMatchObject(expectedDocument);
        expect(dbDocument).toMatchObject(expectedDocument);
      }
    );

    it('should throw if required fields are missing', async () => {
      await expect(DocumentDomain.createDocument({}, [])).rejects.toThrow();
    });
  });

  describe('loadDocumentWithMetadataById', () => {
    it('should load a document with metadata keys', async () => {
      const inserted = await TestHelper.document.create({
        name: 'DocMeta2',
        type: 'meta-type',
        slug: 'doc-meta2',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        active: true,
      });

      await TestHelper.documentMetadata.create({
        document_id: inserted.id,
        key: DocumentMetadataKeyCode.ProductVersion,
        value: '1.2.3',
      });
      const loaded = await DocumentDomain.loadDocumentWithMetadataById(
        inserted.id,
        [DocumentMetadataKeyCode.ProductVersion]
      );
      expect(loaded).toMatchObject({
        id: inserted.id,
        name: 'DocMeta2',
        product_version: '1.2.3',
      });
    });

    it('should return undefined if document does not exist', async () => {
      const loaded = await DocumentDomain.loadDocumentWithMetadataById(
        '00000000-0000-0000-0000-000000000000'
      );
      expect(loaded).toBeUndefined();
    });
  });

  describe('loadDocumentsWithMetadataByIds', () => {
    let doc1: Document;
    let doc2: Document;
    let doc3: Document;
    const TEST_KEY = DocumentMetadataKeyCode.ProductVersion;
    const TEST_VALUE = '2.0.0';

    beforeEach(async () => {
      await TestHelper.documentMetadata.delete({});
      await TestHelper.document.delete({});

      doc1 = await TestHelper.document.create({
        name: 'Doc One',
        slug: 'doc-one',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        active: true,
      });
      doc2 = await TestHelper.document.create({
        name: 'Doc Two',
        slug: 'doc-two',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        active: true,
      });
      doc3 = await TestHelper.document.create({
        name: 'Doc Three',
        slug: 'doc-three',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        active: true,
      });

      await TestHelper.documentMetadata.create({
        document_id: doc1.id,
        key: TEST_KEY,
        value: TEST_VALUE,
      });
    });

    it.each`
      description                       | getIds                                                     | expectedLength | getExpectedIds
      ${'empty array (early return)'}   | ${() => []}                                                | ${0}           | ${() => []}
      ${'single matching id'}           | ${() => [doc1.id]}                                         | ${1}           | ${() => [doc1.id]}
      ${'multiple matching ids'}        | ${() => [doc1.id, doc2.id, doc3.id]}                       | ${3}           | ${() => [doc1.id, doc2.id, doc3.id]}
      ${'no matching id'}               | ${() => ['00000000-0000-0000-0000-000000000000']}          | ${0}           | ${() => []}
      ${'mix of valid and unknown ids'} | ${() => [doc1.id, '00000000-0000-0000-0000-000000000000']} | ${1}           | ${() => [doc1.id]}
    `(
      'should return $expectedLength document(s) for $description',
      async ({
        getIds,
        expectedLength,
        getExpectedIds,
      }: {
        getIds: () => string[];
        expectedLength: number;
        getExpectedIds: () => string[];
      }) => {
        const result =
          await DocumentDomain.loadDocumentsWithMetadataByIds(getIds());
        expect(result).toHaveLength(expectedLength);
        const resultIds = result.map((d) => d.id as string);
        for (const expectedId of getExpectedIds()) {
          expect(resultIds).toContain(expectedId);
        }
      }
    );

    const METADATA_ABSENT = 'METADATA_ABSENT' as const;

    it.each`
      description                | includeMetadata                             | expectedValue
      ${'no metadata requested'} | ${[]}                                       | ${METADATA_ABSENT}
      ${'metadata requested'}    | ${[DocumentMetadataKeyCode.ProductVersion]} | ${TEST_VALUE}
    `(
      'should handle metadata correctly when $description',
      async ({
        includeMetadata,
        expectedValue,
      }: {
        includeMetadata: DocumentMetadataKeyCode[];
        expectedValue: string;
      }) => {
        const result = await DocumentDomain.loadDocumentsWithMetadataByIds(
          [doc1.id],
          includeMetadata
        );
        expect(result).toHaveLength(1);
        const actual = (
          result[0] as unknown as Partial<
            Record<DocumentMetadataKeyCode, string>
          >
        )[TEST_KEY];
        expect(actual).toBe(
          expectedValue === METADATA_ABSENT ? undefined : expectedValue
        );
      }
    );
  });

  describe('loadUploader', () => {
    it('should return the user who uploaded document', async () => {
      const inserted = await TestHelper.document.create({
        name: 'DocMeta2',
        type: 'meta-type',
        slug: 'doc-meta2',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        active: true,
      });

      const uploader = await DocumentDomain.loadUploader(inserted.id);

      expect(uploader).toMatchObject({
        id: ADMIN_UUID,
      });
    });

    it('should return undefined when document does not exist', async () => {
      const uploader = await DocumentDomain.loadUploader(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(uploader).toBeUndefined();
    });
  });

  describe('loadUploaderOrganization', () => {
    it('should return the organization which uploaded document', async () => {
      const inserted = await TestHelper.document.createWholeDocument({});

      const uploaderOrganization =
        await DocumentDomain.loadUploaderOrganization(inserted.id);

      expect(uploaderOrganization).toBeDefined();
      expect(uploaderOrganization!.id).toBe(TEST_ORGANIZATIONS.FILIGRAN.ID);
    });

    it('should return undefined when document does not exist', async () => {
      const uploader = await DocumentDomain.loadUploaderOrganization(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(uploader).toBeUndefined();
    });
  });

  describe('loadSeoDocumentsByServiceSlug', () => {
    const TEST_SERVICE_SLUG = 'opencti-integrations';
    const TEST_METADATA_KEY = DocumentMetadataKeyCode.FeedUrl;
    const TEST_METADATA_VALUE = 'meta_value';

    let parentDoc: Document;
    let childDoc: Document;
    let inactiveDoc: Document;
    let otherServiceDoc: Document;

    beforeEach(async () => {
      await TestHelper.documentChildren.delete({});
      await TestHelper.documentMetadata.delete({});
      await TestHelper.document.delete({});

      parentDoc = await TestHelper.document.create({
        name: 'Parent SEO Doc',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'parent-seo',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
        created_at: new Date('2023-01-01T10:00:00Z'),
        updated_at: new Date('2023-01-02T10:00:00Z'),
      });
      childDoc = await TestHelper.document.create({
        name: 'Child SEO Doc',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'child-seo',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
        created_at: new Date('2023-01-01T11:00:00Z'),
        updated_at: new Date('2023-01-02T11:00:00Z'),
      });
      await TestHelper.documentChildren.create({
        parent_document_id: parentDoc.id,
        child_document_id: childDoc.id,
      });

      inactiveDoc = await TestHelper.document.create({
        name: 'Inactive SEO Doc',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'inactive-seo',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: false,
        created_at: new Date('2023-01-01T12:00:00Z'),
        updated_at: new Date('2023-01-02T12:00:00Z'),
      });

      otherServiceDoc = await TestHelper.document.create({
        name: 'Other Service Doc',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'other-service-doc',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.EPIC.ID,
        active: true,
        created_at: new Date('2023-01-01T13:00:00Z'),
        updated_at: new Date('2023-01-02T13:00:00Z'),
      });

      await TestHelper.documentMetadata.create({
        document_id: parentDoc.id,
        key: TEST_METADATA_KEY,
        value: TEST_METADATA_VALUE,
      });
    });

    it('should return only active parent documents for the given service slug and type', async () => {
      const docs = await DocumentDomain.loadSeoDocumentsByServiceSlug(
        OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        TEST_SERVICE_SLUG
      );

      expect(docs).toHaveLength(1);
      expect(docs[0]).toMatchObject({
        id: parentDoc.id,
        active: true,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
    });

    it('should not return child, inactive, or other-service documents', async () => {
      const docs = await DocumentDomain.loadSeoDocumentsByServiceSlug(
        OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        TEST_SERVICE_SLUG
      );
      const ids = docs.map((d: Document) => d.id);
      expect(ids).not.toContain(childDoc.id);
      expect(ids).not.toContain(inactiveDoc.id);
      expect(ids).not.toContain(otherServiceDoc.id);
    });

    it('should order results by updated_at and created_at descending when orderResults is true', async () => {
      // Insert a second parent doc with later updated_at
      const secondParent = await TestHelper.document.create({
        name: 'Second Parent',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'second-parent',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
        created_at: new Date('2023-01-01T14:00:00Z'),
        updated_at: new Date('2023-01-03T10:00:00Z'),
      });
      const docs = await DocumentDomain.loadSeoDocumentsByServiceSlug(
        OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        TEST_SERVICE_SLUG,
        [],
        true
      );
      expect(docs).toHaveLength(2);
      expect(docs[0].id).toBe(secondParent.id);
      expect(docs[1].id).toBe(parentDoc.id);
    });

    it('should include metadata if requested', async () => {
      const docs = await DocumentDomain.loadSeoDocumentsByServiceSlug(
        OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        TEST_SERVICE_SLUG,
        [TEST_METADATA_KEY]
      );
      expect(docs).toHaveLength(1);
      expect(docs[0][TEST_METADATA_KEY]).toBe(TEST_METADATA_VALUE);
    });

    it('should return empty array if no documents match', async () => {
      const docs = await DocumentDomain.loadSeoDocumentsByServiceSlug(
        'nonexistent-type',
        'nonexistent-slug'
      );
      expect(Array.isArray(docs)).toBe(true);
      expect(docs).toHaveLength(0);
    });
  });

  describe('loadDocumentsByMetadata', () => {
    let doc1: Document;
    let doc2: Document;
    let doc3: Document;
    const TEST_KEY = DocumentMetadataKeyCode.ProductVersion;
    const TEST_VALUE = 'test_value';
    const OTHER_VALUE = 'other_value';

    beforeEach(async () => {
      await TestHelper.document.delete({});
      await TestHelper.documentMetadata.delete({});
      doc1 = await TestHelper.document.create();
      doc2 = await TestHelper.document.create({ slug: 'doc2-slug' });
      doc3 = await TestHelper.document.create({ slug: 'doc3-slug' });
      await TestHelper.documentMetadata.create({
        document_id: doc1.id,
        key: TEST_KEY,
        value: TEST_VALUE,
      });
      await TestHelper.documentMetadata.create({
        document_id: doc2.id,
        key: TEST_KEY,
        value: OTHER_VALUE,
      });
    });

    it('should return documents matching the metadata key and value', async () => {
      const docs = await DocumentDomain.loadDocumentsByMetadata(
        TEST_KEY,
        TEST_VALUE
      );
      expect(Array.isArray(docs)).toBe(true);
      expect(docs).toHaveLength(1);
      expect(docs[0]!.id).toBe(doc1.id);
    });

    it('should return multiple documents if multiple match', async () => {
      await TestHelper.documentMetadata.create({
        document_id: doc3.id,
        key: TEST_KEY,
        value: TEST_VALUE,
      });
      const docs = await DocumentDomain.loadDocumentsByMetadata(
        TEST_KEY,
        TEST_VALUE
      );
      expect(docs).toHaveLength(2);
      const ids = docs.map((d) => d.id);
      expect(ids).toContain(doc1.id);
      expect(ids).toContain(doc3.id);
    });

    it('should return empty array if no documents match', async () => {
      const docs = await DocumentDomain.loadDocumentsByMetadata(
        TEST_KEY,
        'nonexistent'
      );
      expect(Array.isArray(docs)).toBe(true);
      expect(docs).toHaveLength(0);
    });

    it('should include requested metadata fields', async () => {
      const docs = await DocumentDomain.loadDocumentsByMetadata(
        TEST_KEY,
        TEST_VALUE,
        [TEST_KEY]
      );
      expect(docs).toHaveLength(1);
      expect(
        (
          docs[0] as unknown as Partial<Record<DocumentMetadataKeyCode, string>>
        )[TEST_KEY]
      ).toBe(TEST_VALUE);
    });

    describe('when documentFilters are provided', () => {
      it.each`
        description                             | filters                        | expectedCount
        ${'active: true — matches'}             | ${{ active: true }}            | ${1}
        ${'active: false — excludes'}           | ${{ active: false }}           | ${0}
        ${'is_decommissioned: true — excludes'} | ${{ is_decommissioned: true }} | ${0}
      `(
        'should apply scalar filter: $description',
        async ({
          filters,
          expectedCount,
        }: {
          filters: Partial<Document>;
          expectedCount: number;
        }) => {
          const docs = await DocumentDomain.loadDocumentsByMetadata(
            TEST_KEY,
            TEST_VALUE,
            [],
            filters
          );
          expect(docs).toHaveLength(expectedCount);
        }
      );

      it('should return document when tag matches', async () => {
        await TestHelper.document.update({ id: doc1.id }, { tags: ['latest'] });

        const docs = await DocumentDomain.loadDocumentsByMetadata(
          TEST_KEY,
          TEST_VALUE,
          [],
          { tags: ['latest'] }
        );
        expect(docs).toHaveLength(1);
        expect(docs[0]!.id).toBe(doc1.id);
      });

      it('should return no results when tag does not match', async () => {
        await TestHelper.document.update({ id: doc1.id }, { tags: ['latest'] });

        const docs = await DocumentDomain.loadDocumentsByMetadata(
          TEST_KEY,
          TEST_VALUE,
          [],
          { tags: ['latest_lts'] }
        );
        expect(docs).toHaveLength(0);
      });

      it.each`
        doc1Tags          | doc1Active | filterTags    | filterActive | expectedCount | description
        ${['latest']}     | ${true}    | ${['latest']} | ${true}      | ${1}          | ${'tag matches, active matches'}
        ${['latest']}     | ${false}   | ${['latest']} | ${true}      | ${0}          | ${'tag matches, active does not match'}
        ${['latest_lts']} | ${true}    | ${['latest']} | ${true}      | ${0}          | ${'tag does not match, active matches'}
        ${['latest_lts']} | ${false}   | ${['latest']} | ${true}      | ${0}          | ${'nothing matches'}
      `(
        'should combine tag and scalar filters: $description',
        async ({
          doc1Tags,
          doc1Active,
          filterTags,
          filterActive,
          expectedCount,
        }: {
          doc1Tags: string[];
          doc1Active: boolean;
          filterTags: string[];
          filterActive: boolean;
          expectedCount: number;
        }) => {
          await TestHelper.document.update(
            { id: doc1.id },
            { tags: doc1Tags, active: doc1Active }
          );

          const docs = await DocumentDomain.loadDocumentsByMetadata(
            TEST_KEY,
            TEST_VALUE,
            [],
            { active: filterActive, tags: filterTags }
          );
          expect(docs).toHaveLength(expectedCount);
        }
      );
    });
  });

  describe('loadDocumentBy', () => {
    it('should return a document when it exists', async () => {
      // Given
      const doc = await TestHelper.document.create();

      // When
      const result = await DocumentDomain.loadDocumentBy({ id: doc.id });

      // Then
      expect(result).toMatchObject({ id: doc.id, type: 'image' });
    });

    it('should return undefined when document is not found', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000001';

      // When
      const result = await DocumentDomain.loadDocumentBy({
        id: nonExistentId as Document['id'],
      });

      // Then
      expect(result).toBeUndefined();
    });

    it('should filter by multiple fields', async () => {
      // Given
      const doc = await TestHelper.document.create({ active: true });

      // When
      const resultFound = await DocumentDomain.loadDocumentBy({
        id: doc.id,
        active: true,
      });
      const resultNotFound = await DocumentDomain.loadDocumentBy({
        id: doc.id,
        active: false,
      });

      // Then
      expect(resultFound).toMatchObject({ id: doc.id });
      expect(resultNotFound).toBeUndefined();
    });
  });

  describe('loadNewestDocuments', () => {
    beforeEach(async () => {
      await TestHelper.documentChildren.delete({});
      await TestHelper.documentMetadata.delete({});
      await TestHelper.document.delete({});
    });

    it('should return active documents sorted by creation date newest first', async () => {
      // Given
      const olderDoc = await TestHelper.document.create({
        name: 'Older document',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'older-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
        created_at: new Date('2024-01-01T10:00:00Z'),
      });
      const newerDoc = await TestHelper.document.create({
        name: 'Newer document',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'newer-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
        created_at: new Date('2025-01-01T10:00:00Z'),
      });

      // When
      const result = await DocumentDomain.loadNewestDocuments(10);

      // Then
      expect(result[0]?.id).toBe(newerDoc.id);
      expect(result[1]?.id).toBe(olderDoc.id);
    });

    it('should exclude inactive documents', async () => {
      // Given
      const activeDoc = await TestHelper.document.create({
        name: 'Active document',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'active-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
      });
      await TestHelper.document.create({
        name: 'Inactive document',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'inactive-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: false,
      });

      // When
      const result = await DocumentDomain.loadNewestDocuments(10);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(activeDoc.id);
    });

    it('should filter documents by documentTypes', async () => {
      // Given
      const integrationDoc = await TestHelper.document.create({
        name: 'Integration document',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'integration-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
      });
      await TestHelper.document.create({
        name: 'Scenario document',
        type: OPENAEV_SCENARIO_DOCUMENT_TYPE,
        slug: 'scenario-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        active: true,
      });

      // When
      const result = await DocumentDomain.loadNewestDocuments(
        10,
        [],
        [OPENCTI_INTEGRATION_DOCUMENT_TYPE]
      );

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(integrationDoc.id);
    });

    it('should exclude service_picture documents when documentTypes filter does not include it', async () => {
      // Given
      const integrationDoc = await TestHelper.document.create({
        name: 'Integration document',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'integration-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
      });
      await TestHelper.document.create({
        name: 'Service logo',
        type: 'service_picture',
        slug: 'service-logo',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
      });

      // When
      const result = await DocumentDomain.loadNewestDocuments(
        10,
        [],
        [OPENCTI_INTEGRATION_DOCUMENT_TYPE]
      );

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(integrationDoc.id);
    });

    it('should exclude documents tagged with decoupling', async () => {
      // Given
      const normalDoc = await TestHelper.document.create({
        name: 'Normal document',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'normal-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
        tags: [],
      });
      await TestHelper.document.create({
        name: 'Decoupling document',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        slug: 'decoupling-document',
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        active: true,
        tags: ['decoupling'],
      });

      // When
      const result = await DocumentDomain.loadNewestDocuments(10);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(normalDoc.id);
    });
  });

  describe('search by use case name', () => {
    let docWithThreatHunting: Document;
    let docWithIncidentResponse: Document;
    let threatHuntingUseCaseId: UseCaseId;
    let incidentResponseUseCaseId: UseCaseId;

    beforeAll(async () => {
      // Use cases are not wiped by the outer beforeEach, so create them once.
      const uc1 = await TestHelper.useCase.create({
        name: 'threat-hunting-label',
        color: '#ff0000',
      });
      const uc2 = await TestHelper.useCase.create({
        name: 'incident-response-label',
        color: '#0000ff',
      });
      threatHuntingUseCaseId = uc1.id;
      incidentResponseUseCaseId = uc2.id;
    });

    beforeEach(async () => {
      docWithThreatHunting = await TestHelper.document.create({
        slug: 'doc-alpha-uc-search',
        name: 'doc-alpha-uc-search',
        active: true,
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });
      docWithIncidentResponse = await TestHelper.document.create({
        slug: 'doc-beta-uc-search',
        name: 'doc-beta-uc-search',
        active: true,
        uploader_id: ADMIN_UUID,
        uploader_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });
      await TestHelper.objectUseCase.insert([
        {
          object_id:
            docWithThreatHunting.id as unknown as ObjectUseCaseObjectId,
          use_case_id: threatHuntingUseCaseId,
        },
        {
          object_id:
            docWithIncidentResponse.id as unknown as ObjectUseCaseObjectId,
          use_case_id: incidentResponseUseCaseId,
        },
      ]);
    });

    afterAll(async () => {
      await TestHelper.objectUseCase.delete({
        use_case_id: threatHuntingUseCaseId,
      });
      await TestHelper.objectUseCase.delete({
        use_case_id: incidentResponseUseCaseId,
      });
      await TestHelper.useCase.delete({ id: threatHuntingUseCaseId });
      await TestHelper.useCase.delete({ id: incidentResponseUseCaseId });
    });

    it.each`
      description                                   | searchTerm                   | expectedCount | getExpectedId
      ${'exact use case name match'}                | ${'threat-hunting-label'}    | ${1}          | ${() => docWithThreatHunting.id}
      ${'partial use case name match'}              | ${'hunting-label'}           | ${1}          | ${() => docWithThreatHunting.id}
      ${'case-insensitive use case name match'}     | ${'THREAT-HUNTING-LABEL'}    | ${1}          | ${() => docWithThreatHunting.id}
      ${'no match returns no test documents'}       | ${'no-match-label-zzz'}      | ${0}          | ${() => null}
      ${'other use case does not leak into result'} | ${'incident-response-label'} | ${1}          | ${() => docWithIncidentResponse.id}
    `(
      'should return $expectedCount test document(s) when searching "$searchTerm" ($description)',
      async ({
        searchTerm,
        expectedCount,
        getExpectedId,
      }: {
        searchTerm: string;
        expectedCount: number;
        getExpectedId: () => string | null;
      }) => {
        const result = await DocumentDomain.loadDocuments(
          {
            searchTerm,
            first: 100,
            orderBy: DocumentOrdering.CreatedAt,
            orderMode: OrderingMode.Desc,
          },
          {}
        );

        const ids = result.edges.map((e) => e.node.id as string);

        expect(ids).toHaveLength(expectedCount);
        if (expectedCount > 0) {
          expect(ids).toContain(getExpectedId());
        }
      }
    );
  });

  describe('loadBestCompatibleConnectorsBySlugs', () => {
    const createConnector = async ({
      manifestFragmentId,
      slug,
      version,
      minimumDeployableVersionPadded,
      active = true,
      isDecommissioned = false,
      integrationType = IntegrationType.Connector,
    }: {
      manifestFragmentId: string;
      slug: string;
      version: string;
      minimumDeployableVersionPadded?: string;
      active?: boolean;
      isDecommissioned?: boolean;
      integrationType?: IntegrationType;
    }) => {
      const doc = await TestHelper.document.create({
        active,
        is_decommissioned: isDecommissioned,
        slug,
        version,
      });
      await TestHelper.documentMetadata.create({
        document_id: doc.id,
        key: DocumentMetadataKeyCode.IntegrationType as unknown as DocumentMetadataKey,
        value: integrationType,
      });
      await TestHelper.documentMetadata.create({
        document_id: doc.id,
        key: DocumentMetadataKeyCode.ManifestFragmentId as unknown as DocumentMetadataKey,
        value: manifestFragmentId,
      });
      if (minimumDeployableVersionPadded) {
        await TestHelper.documentMetadata.create({
          document_id: doc.id,
          key: DocumentMetadataKeyCode.MinimumDeployableVersionPadded as unknown as DocumentMetadataKey,
          value: minimumDeployableVersionPadded,
        });
      }
      return doc;
    };

    afterEach(async () => {
      await TestHelper.documentMetadata.delete({});
      await TestHelper.document.delete({});
    });

    it('returns an empty array when the slug list is empty', async () => {
      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        [],
        '7.260309.0'
      );
      expect(result).toHaveLength(0);
    });

    it.each([
      {
        description: 'no minimum_deployable_version_padded set',
        minimumDeployableVersionPadded: undefined,
        manifestVersion: '7.260309.0',
      },
      {
        description: 'minimum_deployable_version_padded equals manifestVersion',
        minimumDeployableVersionPadded: '007.260309.000',
        manifestVersion: '7.260309.0',
      },
      {
        description:
          'minimum_deployable_version_padded is below manifestVersion',
        minimumDeployableVersionPadded: '007.260101.000',
        manifestVersion: '7.260309.0',
      },
    ])(
      'returns the connector when $description',
      async ({
        minimumDeployableVersionPadded,
        manifestVersion,
      }: {
        minimumDeployableVersionPadded: string | undefined;
        manifestVersion: string;
      }) => {
        const doc = await createConnector({
          manifestFragmentId: 'fragment-a',
          slug: 'connector-a',
          version: '007.260309.000',
          minimumDeployableVersionPadded,
        });

        const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
          ['connector-a'],
          manifestVersion
        );

        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe(doc.id);
      }
    );

    it('excludes the connector when minimum_deployable_version_padded is above manifestVersion', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260309.000',
        minimumDeployableVersionPadded: '007.260601.000',
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0'
      );

      expect(result).toHaveLength(0);
    });

    it('excludes inactive connectors', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260309.000',
        active: false,
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0'
      );

      expect(result).toHaveLength(0);
    });

    it('excludes decommissioned connectors', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260309.000',
        isDecommissioned: true,
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0'
      );

      expect(result).toHaveLength(0);
    });

    it('excludes documents whose integration_type is not connector', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260309.000',
        integrationType: IntegrationType.CsvFeed,
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0'
      );

      expect(result).toHaveLength(0);
    });

    it('only returns connectors whose slug is in the provided list', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260309.000',
      });
      await createConnector({
        manifestFragmentId: 'fragment-b',
        slug: 'connector-b',
        version: '007.260309.000',
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0'
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.slug).toBe('connector-a');
    });

    it('returns one compatible result per slug and skips incompatible ones', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260309.000',
        minimumDeployableVersionPadded: '007.260101.000',
      });
      await createConnector({
        manifestFragmentId: 'fragment-b',
        slug: 'connector-b',
        version: '007.260309.000',
        minimumDeployableVersionPadded: '007.260601.000',
      });
      await createConnector({
        manifestFragmentId: 'fragment-c',
        slug: 'connector-c',
        version: '007.260101.000',
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a', 'connector-b', 'connector-c'],
        '7.260309.0'
      );

      expect(result).toHaveLength(2);
      const slugs = result.map((r) => r.slug);
      expect(slugs).toContain('connector-a');
      expect(slugs).toContain('connector-c');
      expect(slugs).not.toContain('connector-b');
    });

    it('returns the highest compatible connector version for a slug', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a-newest-incompatible',
        slug: 'connector-a',
        version: '007.260701.000',
        minimumDeployableVersionPadded: '007.260601.000',
      });
      const expected = await createConnector({
        manifestFragmentId: 'fragment-a-newest-compatible',
        slug: 'connector-a',
        version: '007.260401.000',
        minimumDeployableVersionPadded: '007.260101.000',
      });
      await createConnector({
        manifestFragmentId: 'fragment-a-older-compatible',
        slug: 'connector-a',
        version: '007.260101.000',
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: expected.id, slug: 'connector-a' });
    });

    it('excludes LTS connectors when manifest version is not LTS', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260309.000.LTS.005',
        minimumDeployableVersionPadded: '007.260101.000.LTS.001',
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0'
      );

      expect(result).toHaveLength(0);
    });

    it('excludes non-LTS connectors when manifest version is LTS', async () => {
      await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260309.000',
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0-lts.5'
      );

      expect(result).toHaveLength(0);
    });

    it('returns LTS connector when manifest version is LTS and connector is compatible', async () => {
      const doc = await createConnector({
        manifestFragmentId: 'fragment-a',
        slug: 'connector-a',
        version: '007.260101.000.LTS.001',
        minimumDeployableVersionPadded: '007.260101.000.LTS.001',
      });

      const result = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
        ['connector-a'],
        '7.260309.0-lts.5'
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(doc.id);
    });
  });

  describe('loadDistinctConnectorSlugs', () => {
    const REQUESTED_VERSION = '7.260904.0';
    const REQUESTED_LTS_VERSION = '7.260309.0-lts.5';
    const REQUESTED_PADDED_VERSION = '007.260309.000';

    const createConnector = async ({
      slug,
      version,
      active = true,
      isDecommissioned = false,
      integrationType = IntegrationType.Connector,
      tags = [TAG_LATEST, TAG_DECOUPLING],
    }: {
      slug: string;
      version: string;
      active?: boolean;
      isDecommissioned?: boolean;
      integrationType?: IntegrationType;
      tags?: string[];
    }) => {
      const doc = await TestHelper.document.create({
        active,
        is_decommissioned: isDecommissioned,
        slug,
        version,
        tags,
      });
      await TestHelper.documentMetadata.create({
        document_id: doc.id,
        key: DocumentMetadataKeyCode.IntegrationType as unknown as DocumentMetadataKey,
        value: integrationType,
      });
      return doc;
    };

    afterEach(async () => {
      await TestHelper.documentMetadata.delete({});
      await TestHelper.document.delete({});
    });

    it('returns an empty array when there are no connectors', async () => {
      const result =
        await DocumentDomain.loadDistinctConnectorSlugs(REQUESTED_VERSION);
      expect(result).toHaveLength(0);
    });

    it('returns the distinct slugs of the TAG_LATEST connectors', async () => {
      await createConnector({
        slug: 'connector-a',
        version: REQUESTED_PADDED_VERSION,
      });
      await createConnector({
        slug: 'connector-b',
        version: REQUESTED_PADDED_VERSION,
      });
      // An older version of the same connector, no longer tagged TAG_LATEST,
      // must not surface as a separate/duplicate slug.
      await createConnector({
        slug: 'connector-a',
        version: '007.260101.000',
        tags: [TAG_DECOUPLING],
      });

      const result =
        await DocumentDomain.loadDistinctConnectorSlugs(REQUESTED_VERSION);

      expect(result.sort()).toEqual(['connector-a', 'connector-b']);
    });

    it('uses TAG_LATEST_LTS instead of TAG_LATEST when the requested version is LTS', async () => {
      await createConnector({
        slug: 'connector-a',
        version: '007.260309.000.LTS.5',
        tags: [TAG_LATEST_LTS, TAG_DECOUPLING],
      });
      // Regular (non-LTS) latest connector must not be considered known for an LTS request.
      await createConnector({
        slug: 'connector-b',
        version: REQUESTED_PADDED_VERSION,
      });

      const result = await DocumentDomain.loadDistinctConnectorSlugs(
        REQUESTED_LTS_VERSION
      );

      expect(result).toEqual(['connector-a']);
    });

    it('excludes inactive connectors', async () => {
      await createConnector({
        slug: 'connector-a',
        version: REQUESTED_PADDED_VERSION,
        active: false,
      });

      const result =
        await DocumentDomain.loadDistinctConnectorSlugs(REQUESTED_VERSION);

      expect(result).toHaveLength(0);
    });

    it('excludes decommissioned connectors', async () => {
      await createConnector({
        slug: 'connector-a',
        version: REQUESTED_PADDED_VERSION,
        isDecommissioned: true,
      });

      const result =
        await DocumentDomain.loadDistinctConnectorSlugs(REQUESTED_VERSION);

      expect(result).toHaveLength(0);
    });

    it('excludes connectors that are not tagged as decoupled', async () => {
      await createConnector({
        slug: 'connector-a',
        version: REQUESTED_PADDED_VERSION,
        tags: [TAG_LATEST],
      });

      const result =
        await DocumentDomain.loadDistinctConnectorSlugs(REQUESTED_VERSION);

      expect(result).toHaveLength(0);
    });

    it('excludes connectors that are not tagged as latest', async () => {
      await createConnector({
        slug: 'connector-a',
        version: REQUESTED_PADDED_VERSION,
        tags: [TAG_DECOUPLING],
      });

      const result =
        await DocumentDomain.loadDistinctConnectorSlugs(REQUESTED_VERSION);

      expect(result).toHaveLength(0);
    });

    it('excludes documents whose integration_type is not connector', async () => {
      await createConnector({
        slug: 'connector-a',
        version: REQUESTED_PADDED_VERSION,
        integrationType: IntegrationType.CsvFeed,
      });

      const result =
        await DocumentDomain.loadDistinctConnectorSlugs(REQUESTED_VERSION);

      expect(result).toHaveLength(0);
    });
  });

  describe('loadMostDeployedDocuments', () => {
    const createDeployableDocument = (
      name: string,
      type: string,
      service_instance_id: ServiceInstanceId
    ): Promise<Document> =>
      TestHelper.document.create({ name, type, service_instance_id });

    const deployResource = async (resourceId: string, times: number) => {
      for (let i = 0; i < times; i += 1) {
        await TestHelper.oneClickDeployment.insert({
          resource_id: resourceId,
        });
      }
    };

    beforeEach(async () => {
      await TestHelper.oneClickDeployment.deleteAll();
      await TestHelper.document.delete({});
    });

    it('returns documents ordered by deploy count desc and excludes non-deployed ones', async () => {
      const mostDeployed = await createDeployableDocument(
        'most-deployed',
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );
      const middle = await createDeployableDocument(
        'middle',
        OPENAEV_SCENARIO_DOCUMENT_TYPE,
        SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID
      );
      const leastDeployed = await createDeployableDocument(
        'least-deployed',
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );
      await createDeployableDocument(
        'never-deployed',
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );

      await deployResource(mostDeployed.id, 3);
      await deployResource(middle.id, 2);
      await deployResource(leastDeployed.id, 1);

      const result = await DocumentDomain.loadMostDeployedDocuments(10);

      expect(result.map((d) => d.id)).toEqual([
        mostDeployed.id,
        middle.id,
        leastDeployed.id,
      ]);
    });

    it('filters by documentTypes', async () => {
      const customView = await createDeployableDocument(
        'custom-view',
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );
      const scenario = await createDeployableDocument(
        'scenario',
        OPENAEV_SCENARIO_DOCUMENT_TYPE,
        SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID
      );

      await deployResource(customView.id, 1);
      await deployResource(scenario.id, 5);

      const result = await DocumentDomain.loadMostDeployedDocuments(
        10,
        [],
        [OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE]
      );

      expect(result.map((d) => d.id)).toEqual([customView.id]);
    });

    it('respects the limit', async () => {
      const first = await createDeployableDocument(
        'first',
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );
      const second = await createDeployableDocument(
        'second',
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );

      await deployResource(first.id, 3);
      await deployResource(second.id, 2);

      const result = await DocumentDomain.loadMostDeployedDocuments(1);

      expect(result.map((d) => d.id)).toEqual([first.id]);
    });

    it('breaks ties on equal deploy counts deterministically by document id', async () => {
      const docA = await createDeployableDocument(
        'tie-a',
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );
      const docB = await createDeployableDocument(
        'tie-b',
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );

      await deployResource(docA.id, 1);
      await deployResource(docB.id, 1);

      const result = await DocumentDomain.loadMostDeployedDocuments(10);

      const expected = [docA.id, docB.id].sort();
      expect(result.map((d) => d.id)).toEqual(expected);
    });
  });

  describe('service instance visibility', () => {
    const privateServiceInstanceId = uuidv4() as ServiceInstanceId;

    const createDocumentIn = (serviceInstanceId: ServiceInstanceId) =>
      TestHelper.document.create({
        name: `doc-${uuidv4()}`,
        type: OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        slug: `doc-${uuidv4()}`,
        uploader_id: ADMIN_UUID,
        service_instance_id: serviceInstanceId,
        active: true,
      });

    beforeAll(async () => {
      await TestHelper.serviceInstance.create({
        id: privateServiceInstanceId,
        name: 'private-library',
        slug: 'private-library',
        public: false,
      });
    });

    beforeEach(async () => {
      requestContext.set(undefined);
      await TestHelper.oneClickDeployment.deleteAll();
      await TestHelper.document.delete({});
    });

    afterAll(async () => {
      requestContext.set(undefined);
      await TestHelper.subscription.delete({});
      await TestHelper.serviceInstance.delete({ id: privateServiceInstanceId });
    });

    it('should hide newest documents of a non public service instance', async () => {
      const visible = await createDocumentIn(
        SERVICES.INSTANCES.CUSTOM_VIEWS.ID
      );
      const hidden = await createDocumentIn(privateServiceInstanceId);

      const ids = (await DocumentDomain.loadNewestDocuments(50)).map(
        ({ id }) => id
      );

      expect(ids).toContain(visible.id);
      expect(ids).not.toContain(hidden.id);
    });

    it('should hide most deployed documents of a non public service instance', async () => {
      const hidden = await createDocumentIn(privateServiceInstanceId);
      await TestHelper.oneClickDeployment.insert({ resource_id: hidden.id });

      const ids = (await DocumentDomain.loadMostDeployedDocuments(50)).map(
        ({ id }) => id
      );

      expect(ids).not.toContain(hidden.id);
    });

    it('should expose documents of a non public service instance to a subscribed organization', async () => {
      const hidden = await createDocumentIn(privateServiceInstanceId);
      await TestHelper.subscription.create({
        service_instance_id: privateServiceInstanceId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      requestContext.set(requestContextRegistererUserSecondOrga);

      const ids = (await DocumentDomain.loadNewestDocuments(50)).map(
        ({ id }) => id
      );

      expect(ids).toContain(hidden.id);
    });

    it('should keep hiding documents on the anonymous SEO surface even when an organization is subscribed', async () => {
      const hidden = await createDocumentIn(privateServiceInstanceId);
      await TestHelper.subscription.create({
        service_instance_id: privateServiceInstanceId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      requestContext.set(requestContextRegistererUserSecondOrga);

      const result = await DocumentDomain.loadSeoDocumentBySlug(
        OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        hidden.slug as string
      );

      expect(result).toBeUndefined();
    });

    it('should keep documents that belong to no service instance', async () => {
      const orphan = await TestHelper.document.create({
        name: 'orphan',
        type: OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE,
        slug: `orphan-${uuidv4()}`,
        uploader_id: ADMIN_UUID,
        active: true,
      });

      const ids = (await DocumentDomain.loadNewestDocuments(50)).map(
        ({ id }) => id
      );

      expect(ids).toContain(orphan.id);
    });
  });
});
