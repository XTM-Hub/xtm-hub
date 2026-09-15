import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { applySearch, database } from '../../../../knexfile';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  requestContextSimpleUserFiligran2,
  SERVICES,
} from '../../../../tests/tests.const';
import {
  DocumentMetadataKeyCode,
  DocumentOrdering,
  FilterKey,
  LoadDocumentFacetInput,
  LogicalOperator,
  OrderingMode,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import type Document from '../../../model/kanel/public/Document';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { objectSolutionCategoryDomain } from '../../solution-category/object-solution-category/object-solution-category.domain';
import { solutionCategoryDomain } from '../../solution-category/solution-category.domain';
import { objectUseCaseDomain } from '../../use-case/object-use-case/object-use-case.domain';
import { useCaseDomain } from '../../use-case/use-case.domain';
import { DocumentApp } from '../document.app';
import { isUserRestrictedToActiveDocument } from '../document.security';
import { FacetDomain } from './facet.domain';
import {
  groupFacetsBySignature,
  stripFilterKeyFromLogicalFilter,
} from './facet.grouping.utils';
import {
  buildScopedDocumentIdsQuery,
  loadEntityTypeFacetBuckets,
  loadMetadataFacetBucketsGrouped,
  loadSolutionCategoryFacetBuckets,
  loadUseCaseFacetBuckets,
} from './facet.queries';

const OPENCTI_INTEGRATION_DOCUMENT_TYPE = 'opencti_integration';
const INTEGRATION_CONNECTOR_VALUE = 'connector';
const INTEGRATION_CSV_FEED_VALUE = 'csv_feed';
const VERIFIED_TRUE_VALUE = 'true';
const VERIFIED_FALSE_VALUE = 'false';
const ENTITY_TYPE_MALWARE = 'Malware';
const ENTITY_TYPE_THREAT_ACTOR = 'Threat-Actor';

vi.mock('../../../utils/feature-flag.util', () => ({
  isFeatureEnabled: vi.fn(() => false),
}));

describe('facet.domain', () => {
  const createdDocumentIds: string[] = [];
  const createdServiceInstanceIds: string[] = [];
  const createdUseCaseIds: string[] = [];
  const createdSolutionCategoryIds: string[] = [];

  afterEach(async () => {
    await TestHelper.objectUseCase.delete({});
    await TestHelper.objectSolutionCategory.delete({});
    await TestHelper.documentMetadata.delete({});
    await TestHelper.documentChildren.delete({});
    await TestHelper.document.delete({});
    await TestHelper.useCase.delete({});
    for (const solutionCategoryId of createdSolutionCategoryIds.splice(0)) {
      await solutionCategoryDomain.deleteSolutionCategory({
        id: solutionCategoryId,
      });
    }
    for (const serviceInstanceId of createdServiceInstanceIds.splice(0)) {
      await TestHelper.serviceInstance.delete({
        id: serviceInstanceId as ServiceInstanceId,
      });
    }
    createdDocumentIds.splice(0);
    createdUseCaseIds.splice(0);
  });

  it('should load scoped facet buckets when logical filters are applied', async () => {
    // Given
    const serviceInstance = await TestHelper.serviceInstance.create({
      name: `facet-service-instance-${uuidv4()}`,
      public: true,
    });
    createdServiceInstanceIds.push(serviceInstance.id);

    const connectorTrueDocument = await TestHelper.document.create({
      name: `facet-connector-true-${uuidv4()}`,
      slug: `facet-connector-true-${uuidv4()}`,
      type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      active: true,
      service_instance_id: serviceInstance.id,
    });
    const csvTrueDocument = await TestHelper.document.create({
      name: `facet-csv-true-${uuidv4()}`,
      slug: `facet-csv-true-${uuidv4()}`,
      type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      active: true,
      service_instance_id: serviceInstance.id,
    });
    const connectorFalseDocument = await TestHelper.document.create({
      name: `facet-connector-false-${uuidv4()}`,
      slug: `facet-connector-false-${uuidv4()}`,
      type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      active: true,
      service_instance_id: serviceInstance.id,
    });
    createdDocumentIds.push(
      connectorTrueDocument.id,
      csvTrueDocument.id,
      connectorFalseDocument.id
    );

    const [incidentUseCase, threatHuntingUseCase] = await Promise.all([
      useCaseDomain.insertUseCase({
        name: `facet-use-case-incident-${uuidv4()}`,
        color: '#000000',
      }),
      useCaseDomain.insertUseCase({
        name: `facet-use-case-threat-${uuidv4()}`,
        color: '#ffffff',
      }),
    ]);
    createdUseCaseIds.push(incidentUseCase.id, threatHuntingUseCase.id);

    const [edrSolutionCategory, siemSolutionCategory] = await Promise.all([
      solutionCategoryDomain.insertSolutionCategory({
        name: `facet-solution-category-edr-${uuidv4()}`,
      }),
      solutionCategoryDomain.insertSolutionCategory({
        name: `facet-solution-category-siem-${uuidv4()}`,
      }),
    ]);
    createdSolutionCategoryIds.push(
      edrSolutionCategory.id,
      siemSolutionCategory.id
    );

    await Promise.all([
      TestHelper.documentMetadata.create({
        document_id: connectorTrueDocument.id,
        key: DocumentMetadataKeyCode.IntegrationType,
        value: INTEGRATION_CONNECTOR_VALUE,
      }),
      TestHelper.documentMetadata.create({
        document_id: connectorTrueDocument.id,
        key: DocumentMetadataKeyCode.Verified,
        value: VERIFIED_TRUE_VALUE,
      }),
      TestHelper.documentMetadata.create({
        document_id: connectorTrueDocument.id,
        key: DocumentMetadataKeyCode.EntityTypes,
        value: JSON.stringify([ENTITY_TYPE_MALWARE]),
      }),
      TestHelper.documentMetadata.create({
        document_id: csvTrueDocument.id,
        key: DocumentMetadataKeyCode.IntegrationType,
        value: INTEGRATION_CSV_FEED_VALUE,
      }),
      TestHelper.documentMetadata.create({
        document_id: csvTrueDocument.id,
        key: DocumentMetadataKeyCode.Verified,
        value: VERIFIED_TRUE_VALUE,
      }),
      TestHelper.documentMetadata.create({
        document_id: csvTrueDocument.id,
        key: DocumentMetadataKeyCode.EntityTypes,
        value: JSON.stringify([ENTITY_TYPE_THREAT_ACTOR]),
      }),
      TestHelper.documentMetadata.create({
        document_id: connectorFalseDocument.id,
        key: DocumentMetadataKeyCode.IntegrationType,
        value: INTEGRATION_CONNECTOR_VALUE,
      }),
      TestHelper.documentMetadata.create({
        document_id: connectorFalseDocument.id,
        key: DocumentMetadataKeyCode.Verified,
        value: VERIFIED_FALSE_VALUE,
      }),
      TestHelper.documentMetadata.create({
        document_id: connectorFalseDocument.id,
        key: DocumentMetadataKeyCode.EntityTypes,
        value: JSON.stringify([ENTITY_TYPE_MALWARE]),
      }),
      objectUseCaseDomain.insertObjectUseCase({
        object_id: connectorTrueDocument.id,
        use_case_id: incidentUseCase.id,
      }),
      objectUseCaseDomain.insertObjectUseCase({
        object_id: csvTrueDocument.id,
        use_case_id: threatHuntingUseCase.id,
      }),
      objectSolutionCategoryDomain.insertObjectSolutionCategory({
        object_id: connectorTrueDocument.id,
        solution_category_id: edrSolutionCategory.id,
      }),
      objectSolutionCategoryDomain.insertObjectSolutionCategory({
        object_id: csvTrueDocument.id,
        solution_category_id: siemSolutionCategory.id,
      }),
    ]);

    // When
    const result = await FacetDomain.loadDocumentFacets({
      serviceInstanceId: serviceInstance.id,
      documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
      logicalFilters: {
        operator: LogicalOperator.And,
        children: [
          {
            leaf: {
              key: FilterKey.IntegrationType,
              value: [INTEGRATION_CONNECTOR_VALUE],
            },
          },
          {
            leaf: {
              key: FilterKey.Verified,
              value: [VERIFIED_TRUE_VALUE],
            },
          },
        ],
      },
    });

    // Then
    expect(result.integration_type).toEqual([
      { value: INTEGRATION_CONNECTOR_VALUE, count: 1 },
      { value: INTEGRATION_CSV_FEED_VALUE, count: 1 },
    ]);
    expect(result.verified).toEqual([
      { value: VERIFIED_FALSE_VALUE, count: 1 },
      { value: VERIFIED_TRUE_VALUE, count: 1 },
    ]);
    expect(result.use_case).toEqual([{ value: incidentUseCase.id, count: 1 }]);
    expect(result.solution_category).toEqual([
      { value: edrSolutionCategory.id, count: 1 },
    ]);
    expect(result.entity_type).toEqual([
      { value: ENTITY_TYPE_MALWARE, count: 1 },
    ]);
  });
  describe('parity with the authenticated documents list', () => {
    afterEach(async () => {
      requestContext.set(undefined);
      await TestHelper.subscription.delete({});
    });

    it('should count exactly the documents the authenticated list returns for a private subscribed instance', async () => {
      // Given — a private instance the fixture user's organization subscribes to
      const privateServiceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_INTEGRATIONS.ID,
        name: `facet-parity-private-${uuidv4()}`,
        slug: `facet-parity-private-${uuidv4()}`,
        public: false,
      });
      createdServiceInstanceIds.push(privateServiceInstance.id);

      await TestHelper.subscription.create({
        service_instance_id: privateServiceInstance.id,
        organization_id: requestContextSimpleUserFiligran2.user
          .selected_organization_id as OrganizationId,
      });

      // 2 active + 1 inactive documents. Every document carries exactly ONE
      // Verified metadata value: this is the invariant that makes
      // sum(verified buckets) === list totalCount a valid parity check.
      const activeVerified = await TestHelper.document.create({
        name: `facet-parity-a-${uuidv4()}`,
        slug: `facet-parity-a-${uuidv4()}`,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        active: true,
        service_instance_id: privateServiceInstance.id,
      });
      const activeUnverified = await TestHelper.document.create({
        name: `facet-parity-b-${uuidv4()}`,
        slug: `facet-parity-b-${uuidv4()}`,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        active: true,
        service_instance_id: privateServiceInstance.id,
      });
      const inactiveVerified = await TestHelper.document.create({
        name: `facet-parity-c-${uuidv4()}`,
        slug: `facet-parity-c-${uuidv4()}`,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        active: false,
        service_instance_id: privateServiceInstance.id,
      });
      createdDocumentIds.push(
        activeVerified.id,
        activeUnverified.id,
        inactiveVerified.id
      );

      await Promise.all([
        TestHelper.documentMetadata.create({
          document_id: activeVerified.id,
          key: DocumentMetadataKeyCode.Verified,
          value: VERIFIED_TRUE_VALUE,
        }),
        TestHelper.documentMetadata.create({
          document_id: activeUnverified.id,
          key: DocumentMetadataKeyCode.Verified,
          value: VERIFIED_FALSE_VALUE,
        }),
        TestHelper.documentMetadata.create({
          document_id: inactiveVerified.id,
          key: DocumentMetadataKeyCode.Verified,
          value: VERIFIED_TRUE_VALUE,
        }),
      ]);

      // When — same user in context, list and facets called with the same scope
      const { connection, facets } = await requestContext.run(
        requestContextSimpleUserFiligran2,
        async () => {
          const connection = await DocumentApp.loadDocuments({
            serviceInstanceId: privateServiceInstance.id,
            first: 50,
            orderBy: DocumentOrdering.CreatedAt,
            orderMode: OrderingMode.Asc,
          });

          const facets = await FacetDomain.loadDocumentFacets({
            serviceInstanceId: privateServiceInstance.id,
            documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            logicalFilters: null,
          });

          return { connection, facets };
        }
      );

      // Then — the facet counts and the list agree on what this user can see
      const verifiedSum = facets.verified.reduce(
        (sum, bucket) => sum + bucket.count,
        0
      );
      // isUserRestrictedToActiveDocument short-circuits on isUserGranted(user), which
      // without a capability argument means "any authenticated user" — so authenticated
      // users always see inactive documents. The parity we assert is that facets follow
      // the list either way.
      expect(verifiedSum).toBe(Number(connection.totalCount));
      expect(Number(connection.totalCount)).toBe(3);
    });
  });

  describe('single-query batching parity', () => {
    const LICENSE_TYPE_COMMERCIAL = 'commercial';
    const LICENSE_TYPE_OPEN_SOURCE = 'open_source';
    const MANAGER_SUPPORTED_TRUE = 'true';
    const MANAGER_SUPPORTED_FALSE = 'false';
    const PRODUCT_VERSION_A = '1.0.0';
    const PRODUCT_VERSION_B = '2.0.0';
    const NON_FACET_SLUG_FILTER_VALUE = 'facet-batching-doc-a';

    let serviceInstanceId: ServiceInstanceId;
    let docAId: string;
    let docBId: string;
    let useCaseAId: string;
    let useCaseBId: string;
    let solutionCategoryAId: string;
    let solutionCategoryBId: string;

    const buildNaiveScopedQuery = async (
      input: LoadDocumentFacetInput,
      filterKey: FilterKey,
      restrictToActive: boolean
    ): Promise<{ scoped: Knex.QueryBuilder<Document> }> => {
      const scoped = buildScopedDocumentIdsQuery(
        {
          ...input,
          logicalFilters: stripFilterKeyFromLogicalFilter(
            input.logicalFilters,
            filterKey
          ),
        },
        restrictToActive
      );
      await applySearch(
        'Document',
        scoped,
        input.searchTerm ?? undefined,
        true
      );
      return { scoped };
    };

    const loadDocumentFacetsNaive = async (
      input: LoadDocumentFacetInput,
      restrictToActive: boolean
    ) => {
      const [
        integrationType,
        licenseType,
        managerSupported,
        verified,
        productVersion,
        solutionCategory,
        useCase,
        entityType,
      ] = await Promise.all([
        buildNaiveScopedQuery(
          input,
          FilterKey.IntegrationType,
          restrictToActive
        ).then(({ scoped }) =>
          loadMetadataFacetBucketsGrouped(scoped, [
            DocumentMetadataKeyCode.IntegrationType,
          ]).then((byKey) => byKey[DocumentMetadataKeyCode.IntegrationType])
        ),
        buildNaiveScopedQuery(
          input,
          FilterKey.LicenseType,
          restrictToActive
        ).then(({ scoped }) =>
          loadMetadataFacetBucketsGrouped(scoped, [
            DocumentMetadataKeyCode.LicenseType,
          ]).then((byKey) => byKey[DocumentMetadataKeyCode.LicenseType])
        ),
        buildNaiveScopedQuery(
          input,
          FilterKey.ManagerSupported,
          restrictToActive
        ).then(({ scoped }) =>
          loadMetadataFacetBucketsGrouped(scoped, [
            DocumentMetadataKeyCode.ManagerSupported,
          ]).then((byKey) => byKey[DocumentMetadataKeyCode.ManagerSupported])
        ),
        buildNaiveScopedQuery(input, FilterKey.Verified, restrictToActive).then(
          ({ scoped }) =>
            loadMetadataFacetBucketsGrouped(scoped, [
              DocumentMetadataKeyCode.Verified,
            ]).then((byKey) => byKey[DocumentMetadataKeyCode.Verified])
        ),
        buildNaiveScopedQuery(
          input,
          FilterKey.ProductVersion,
          restrictToActive
        ).then(({ scoped }) =>
          loadMetadataFacetBucketsGrouped(scoped, [
            DocumentMetadataKeyCode.ProductVersion,
          ]).then((byKey) => byKey[DocumentMetadataKeyCode.ProductVersion])
        ),
        buildNaiveScopedQuery(
          input,
          FilterKey.SolutionCategory,
          restrictToActive
        ).then(({ scoped }) => loadSolutionCategoryFacetBuckets(scoped)),
        buildNaiveScopedQuery(input, FilterKey.Label, restrictToActive).then(
          ({ scoped }) => loadUseCaseFacetBuckets(scoped)
        ),
        buildNaiveScopedQuery(
          input,
          FilterKey.EntityType,
          restrictToActive
        ).then(({ scoped }) => loadEntityTypeFacetBuckets(scoped)),
      ]);

      return {
        integration_type: integrationType ?? [],
        license_type: licenseType ?? [],
        manager_supported: managerSupported ?? [],
        verified: verified ?? [],
        product_version: productVersion ?? [],
        solution_category: solutionCategory,
        use_case: useCase,
        entity_type: entityType,
      };
    };

    const expectParity = async (input: LoadDocumentFacetInput) => {
      // Given — restrictToActive computed exactly like the domain does
      const user = requestContext.get()?.user;
      const restrictToActive =
        !user ||
        (await isUserRestrictedToActiveDocument(user, input.serviceInstanceId));

      // When
      const [actual, expected] = await Promise.all([
        FacetDomain.loadDocumentFacets(input),
        loadDocumentFacetsNaive(input, restrictToActive),
      ]);

      // Then
      expect(actual).toEqual(expected);
      return actual;
    };

    beforeEach(async () => {
      const serviceInstance = await TestHelper.serviceInstance.create({
        name: `facet-batching-service-instance-${uuidv4()}`,
        public: true,
      });
      serviceInstanceId = serviceInstance.id;

      const docA = await TestHelper.document.create({
        name: `facet-batching-doc-a-${uuidv4()}`,
        slug: NON_FACET_SLUG_FILTER_VALUE,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        active: true,
        service_instance_id: serviceInstanceId,
      });
      const docB = await TestHelper.document.create({
        name: `facet-batching-doc-b-${uuidv4()}`,
        slug: `facet-batching-doc-b-${uuidv4()}`,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        active: true,
        service_instance_id: serviceInstanceId,
      });
      docAId = docA.id;
      docBId = docB.id;

      const [useCaseA, useCaseB] = await Promise.all([
        useCaseDomain.insertUseCase({
          name: `facet-batching-use-case-a-${uuidv4()}`,
          color: '#000000',
        }),
        useCaseDomain.insertUseCase({
          name: `facet-batching-use-case-b-${uuidv4()}`,
          color: '#ffffff',
        }),
      ]);
      useCaseAId = useCaseA.id;
      useCaseBId = useCaseB.id;

      const [solutionCategoryA, solutionCategoryB] = await Promise.all([
        solutionCategoryDomain.insertSolutionCategory({
          name: `facet-batching-solution-category-a-${uuidv4()}`,
        }),
        solutionCategoryDomain.insertSolutionCategory({
          name: `facet-batching-solution-category-b-${uuidv4()}`,
        }),
      ]);
      solutionCategoryAId = solutionCategoryA.id;
      solutionCategoryBId = solutionCategoryB.id;

      await Promise.all([
        TestHelper.documentMetadata.create({
          document_id: docAId,
          key: DocumentMetadataKeyCode.IntegrationType,
          value: INTEGRATION_CONNECTOR_VALUE,
        }),
        TestHelper.documentMetadata.create({
          document_id: docBId,
          key: DocumentMetadataKeyCode.IntegrationType,
          value: INTEGRATION_CSV_FEED_VALUE,
        }),
        TestHelper.documentMetadata.create({
          document_id: docAId,
          key: DocumentMetadataKeyCode.LicenseType,
          value: LICENSE_TYPE_COMMERCIAL,
        }),
        TestHelper.documentMetadata.create({
          document_id: docBId,
          key: DocumentMetadataKeyCode.LicenseType,
          value: LICENSE_TYPE_OPEN_SOURCE,
        }),
        TestHelper.documentMetadata.create({
          document_id: docAId,
          key: DocumentMetadataKeyCode.ManagerSupported,
          value: MANAGER_SUPPORTED_TRUE,
        }),
        TestHelper.documentMetadata.create({
          document_id: docBId,
          key: DocumentMetadataKeyCode.ManagerSupported,
          value: MANAGER_SUPPORTED_FALSE,
        }),
        TestHelper.documentMetadata.create({
          document_id: docAId,
          key: DocumentMetadataKeyCode.Verified,
          value: VERIFIED_TRUE_VALUE,
        }),
        TestHelper.documentMetadata.create({
          document_id: docBId,
          key: DocumentMetadataKeyCode.Verified,
          value: VERIFIED_FALSE_VALUE,
        }),
        TestHelper.documentMetadata.create({
          document_id: docAId,
          key: DocumentMetadataKeyCode.ProductVersion,
          value: PRODUCT_VERSION_A,
        }),
        TestHelper.documentMetadata.create({
          document_id: docBId,
          key: DocumentMetadataKeyCode.ProductVersion,
          value: PRODUCT_VERSION_B,
        }),
        TestHelper.documentMetadata.create({
          document_id: docAId,
          key: DocumentMetadataKeyCode.EntityTypes,
          value: JSON.stringify([ENTITY_TYPE_MALWARE]),
        }),
        TestHelper.documentMetadata.create({
          document_id: docBId,
          key: DocumentMetadataKeyCode.EntityTypes,
          value: JSON.stringify([ENTITY_TYPE_THREAT_ACTOR]),
        }),
        objectUseCaseDomain.insertObjectUseCase({
          object_id: docAId,
          use_case_id: useCaseAId,
        }),
        objectUseCaseDomain.insertObjectUseCase({
          object_id: docBId,
          use_case_id: useCaseBId,
        }),
        objectSolutionCategoryDomain.insertObjectSolutionCategory({
          object_id: docAId,
          solution_category_id: solutionCategoryAId,
        }),
        objectSolutionCategoryDomain.insertObjectSolutionCategory({
          object_id: docBId,
          solution_category_id: solutionCategoryBId,
        }),
      ]);
    });

    afterAll(async () => {
      await TestHelper.objectUseCase.delete({});
      await TestHelper.objectSolutionCategory.delete({});
      await TestHelper.documentMetadata.delete({});
      await TestHelper.document.delete({});
      await TestHelper.useCase.delete({});
      await solutionCategoryDomain.deleteSolutionCategory({
        id: solutionCategoryAId,
      });
      await solutionCategoryDomain.deleteSolutionCategory({
        id: solutionCategoryBId,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
    });

    it.each([
      ['no logical filters', null, null],
      ['a search term only', null, 'facet-batching'],
      [
        'one facet filter',
        { leaf: { key: FilterKey.IntegrationType, value: ['connector'] } },
        null,
      ],
      [
        'two facet filters',
        {
          operator: LogicalOperator.And,
          children: [
            { leaf: { key: FilterKey.IntegrationType, value: ['connector'] } },
            { leaf: { key: FilterKey.Verified, value: ['true'] } },
          ],
        },
        null,
      ],
      [
        'all 8 facet keys filtered',
        {
          operator: LogicalOperator.And,
          children: [
            { leaf: { key: FilterKey.IntegrationType, value: ['connector'] } },
            { leaf: { key: FilterKey.LicenseType, value: ['commercial'] } },
            {
              leaf: { key: FilterKey.ManagerSupported, value: ['true'] },
            },
            { leaf: { key: FilterKey.Verified, value: ['true'] } },
            { leaf: { key: FilterKey.ProductVersion, value: ['1.0.0'] } },
          ],
        },
        null,
      ],
      [
        'a filter on a non-facet key (slug)',
        { leaf: { key: FilterKey.Slug, value: [NON_FACET_SLUG_FILTER_VALUE] } },
        null,
      ],
      [
        'an empty result set (a filter no document matches)',
        {
          leaf: { key: FilterKey.IntegrationType, value: ['no-such-value'] },
        },
        null,
      ],
    ])(
      'should produce identical facet buckets for the batched and naive implementations given %s',
      async (_description, logicalFilters, searchTerm) => {
        await expectParity({
          serviceInstanceId,
          documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          logicalFilters,
          searchTerm,
        });
      }
    );

    const METADATA_FACET_VALUES: Record<
      | 'integration_type'
      | 'license_type'
      | 'manager_supported'
      | 'verified'
      | 'product_version',
      [string, string]
    > = {
      integration_type: [
        INTEGRATION_CONNECTOR_VALUE,
        INTEGRATION_CSV_FEED_VALUE,
      ],
      license_type: [LICENSE_TYPE_COMMERCIAL, LICENSE_TYPE_OPEN_SOURCE],
      manager_supported: [MANAGER_SUPPORTED_TRUE, MANAGER_SUPPORTED_FALSE],
      verified: [VERIFIED_TRUE_VALUE, VERIFIED_FALSE_VALUE],
      product_version: [PRODUCT_VERSION_A, PRODUCT_VERSION_B],
    };

    it.each([
      ['integration_type', FilterKey.IntegrationType] as const,
      ['license_type', FilterKey.LicenseType] as const,
      ['manager_supported', FilterKey.ManagerSupported] as const,
      ['verified', FilterKey.Verified] as const,
      ['product_version', FilterKey.ProductVersion] as const,
    ])(
      'should ignore its own filter for the %s facet while every other facet still respects it',
      async (ownField, filterKey) => {
        // Given — filter down to document A's own value for this facet.
        // Every OTHER metadata facet is NOT stripped, so it stays scoped to
        // document A alone (document A is the only document with this value).
        const [ownValueA] = METADATA_FACET_VALUES[ownField];
        const result = await FacetDomain.loadDocumentFacets({
          serviceInstanceId,
          documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          logicalFilters: { leaf: { key: filterKey, value: [ownValueA] } },
        });

        // Then — the filtered facet ignores its own filter and still lists
        // BOTH documents' values...
        expect(result[ownField].map((b) => b.value).sort()).toEqual(
          [...METADATA_FACET_VALUES[ownField]].sort()
        );
        // ...while every other metadata facet still respects the filter and
        // only lists document A's value...
        (
          Object.keys(METADATA_FACET_VALUES) as Array<
            keyof typeof METADATA_FACET_VALUES
          >
        )
          .filter((field) => field !== ownField)
          .forEach((otherField) => {
            const [otherValueA] = METADATA_FACET_VALUES[otherField];
            expect(result[otherField].map((b) => b.value)).toEqual([
              otherValueA,
            ]);
          });
        // ...and a non-metadata facet (use_case) still respects the filter
        // too: only document A matches, so only its use case shows up.
        expect(result.use_case).toEqual([{ value: useCaseAId, count: 1 }]);
      }
    );

    it('should query the database exactly once for the whole facet request', async () => {
      // Given — warm the column-info cache deterministically first: it's a
      // separate, cached round-trip behind `applySearch` and must not be
      // conflated with the facet query itself.
      await applySearch('Document', undefined, undefined);

      let queryCount = 0;
      const onQuery = () => {
        queryCount += 1;
      };
      database.on('query', onQuery);

      try {
        // When
        await FacetDomain.loadDocumentFacets({
          serviceInstanceId,
          documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          logicalFilters: null,
        });
      } finally {
        database.off('query', onQuery);
      }

      // Then — one round-trip for the whole UNION ALL statement.
      expect(queryCount).toBe(1);
    });

    it('should build byte-identical scoped SQL for every facet sharing a signature group', () => {
      // Given — a filter that only strips out `verified` for that one facet,
      // so the other 7 facets end up in one shared group (a non-vacuous
      // check: the shared group must have more than one spec in it).
      const logicalFilters = {
        leaf: { key: FilterKey.Verified, value: [VERIFIED_TRUE_VALUE] },
      };
      const groups = groupFacetsBySignature(logicalFilters);

      // When
      const uniqueSqlCountPerGroup = groups.map((group) => {
        const sqlPerSpec = group.specs.map(
          () =>
            buildScopedDocumentIdsQuery(
              {
                serviceInstanceId,
                documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
                logicalFilters: group.strippedFilter,
              },
              true
            ).toSQL().sql
        );
        return new Set(sqlPerSpec).size;
      });

      // Then — every group, however many specs it holds, is internally
      // byte-identical, and the shared group genuinely holds more than one.
      expect(uniqueSqlCountPerGroup).toEqual(groups.map(() => 1));
      expect(groups.some((group) => group.specs.length > 1)).toBe(true);
    });

    it('should never return undefined buckets for a facet with zero matching rows', async () => {
      // Given — a filter no document's integration_type matches
      const result = await FacetDomain.loadDocumentFacets({
        serviceInstanceId,
        documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        logicalFilters: {
          leaf: { key: FilterKey.IntegrationType, value: ['no-such-value'] },
        },
      });

      // Then — the filtered facet ignores its own filter (self-ignoring
      // semantics) and still lists all values...
      expect(result.integration_type.map((b) => b.value).sort()).toEqual(
        [INTEGRATION_CONNECTOR_VALUE, INTEGRATION_CSV_FEED_VALUE].sort()
      );
      // ...while every other facet, scoped by the unmatched filter, is empty.
      expect(result.license_type).toEqual([]);
      expect(result.use_case).toEqual([]);
    });
  });
});
