import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  requestContextSimpleUserFiligran2,
  SERVICES,
} from '../../../../tests/tests.const';
import {
  DocumentMetadataKeyCode,
  DocumentOrdering,
  FilterKey,
  LogicalOperator,
  OrderingMode,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { objectSolutionCategoryDomain } from '../../solution-category/object-solution-category/object-solution-category.domain';
import { solutionCategoryDomain } from '../../solution-category/solution-category.domain';
import { objectUseCaseDomain } from '../../use-case/object-use-case/object-use-case.domain';
import { useCaseDomain } from '../../use-case/use-case.domain';
import { DocumentApp } from '../document.app';
import { FacetDomain } from './facet.domain';

const OPENCTI_INTEGRATION_DOCUMENT_TYPE = 'opencti_integration';
const INTEGRATION_CONNECTOR_VALUE = 'connector';
const INTEGRATION_CSV_FEED_VALUE = 'csv_feed';
const VERIFIED_TRUE_VALUE = 'true';
const VERIFIED_FALSE_VALUE = 'false';
const ENTITY_TYPE_MALWARE = 'Malware';
const ENTITY_TYPE_THREAT_ACTOR = 'Threat-Actor';

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
});
