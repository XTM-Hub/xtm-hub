import { Knex } from 'knex';
import {
  applySearch,
  db,
  dbRaw,
  whereMetadataListContainsAny,
} from '../../../../../../knexfile';
import {
  DocumentMetadataKeyCode,
  Facet,
} from '../../../../../__generated__/resolvers-types';
import type Document from '../../../../../model/kanel/public/Document';
import type { DocumentId } from '../../../../../model/kanel/public/Document';
import type DocumentMetadata from '../../../../../model/kanel/public/DocumentMetadata';
import type { DocumentMetadataKey } from '../../../../../model/kanel/public/DocumentMetadata';
import type SolutionCategory from '../../../../../model/kanel/public/SolutionCategory';
import type UseCase from '../../../../../model/kanel/public/UseCase';
import { restrictServiceInstanceToPublic } from '../../../../../security/restriction/service-instance';
import { applyDecouplingRestriction } from '../../../../document/domain/document.domain';
import { DocumentMetadataDomain } from '../../../../document/domain/document.metadata.domain';
import {
  loadMetadataFacetBucketsGrouped,
  loadMetadataListFacetBuckets,
  loadSolutionCategoryFacetBuckets,
  loadUseCaseFacetBuckets,
} from '../../../../document/facet/facet.queries';
import { solutionCategoryDomain } from '../../../../solution-category/solution-category.domain';
import { useCaseDomain } from '../../../../use-case/use-case.domain';
import {
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../integration.model';
import { IntegrationCoverageHelper } from './integration-coverage.helper';
import {
  COVERAGE_FAMILIES,
  COVERAGE_METADATA_KEY_BY_FAMILY,
  COVERAGE_METADATA_KEYS,
  COVERAGE_SEARCH_MAX_CANDIDATES,
  StoredIntegrationCoverage,
} from './integration-coverage.model';
import {
  CoverageSearchRequest,
  IntegrationCoverageSearchHelper,
} from './integration-coverage.search.helper';

export type CoverageCandidateRow = Pick<
  Document,
  'id' | 'name' | 'slug' | 'short_description'
> &
  Partial<Record<DocumentMetadataKeyCode, unknown>>;

export type CoverageInferenceRow = Pick<
  Document,
  'id' | 'name' | 'short_description' | 'description'
> &
  Partial<Record<DocumentMetadataKeyCode, unknown>>;

const CANDIDATE_METADATA_KEYS: DocumentMetadataKeyCode[] = [
  DocumentMetadataKeyCode.IntegrationType,
  DocumentMetadataKeyCode.LicenseType,
  DocumentMetadataKeyCode.Verified,
  DocumentMetadataKeyCode.ManagerSupported,
  ...COVERAGE_METADATA_KEYS,
];

const FACET_METADATA_KEYS: DocumentMetadataKeyCode[] = [
  DocumentMetadataKeyCode.IntegrationType,
  DocumentMetadataKeyCode.LicenseType,
  DocumentMetadataKeyCode.ManagerSupported,
  DocumentMetadataKeyCode.Verified,
  DocumentMetadataKeyCode.ProductVersion,
];

const excludeChildDocuments = (query: Knex.QueryBuilder) =>
  query.whereNotExists(function () {
    this.select(dbRaw('1'))
      .from('Document_Children')
      .whereRaw('"Document_Children"."child_document_id" = "Document"."id"');
  });

const groupNamesByDocumentId = (
  rows: Array<{ _document_id: string; name: string | null }>
): Map<string, string[]> => {
  const namesByDocumentId = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.name) continue;
    const names = namesByDocumentId.get(row._document_id) ?? [];
    names.push(row.name);
    namesByDocumentId.set(row._document_id, names);
  }
  return namesByDocumentId;
};

/**
 * Same exposure as publicDocuments: active parent integrations of the public
 * OpenCTI integrations service instance, with the connector decoupling rules.
 * Wrapped in an object: awaiting a bare query builder would execute it.
 */
const buildCandidatesQuery = async (
  request: CoverageSearchRequest
): Promise<{ query: Knex.QueryBuilder }> => {
  const query = db<Document>('Document')
    .leftJoin(
      'ServiceInstance',
      'Document.service_instance_id',
      'ServiceInstance.id'
    )
    .where('Document.service_instance_id', INTEGRATION_SERVICE_INSTANCE_ID)
    .tap(restrictServiceInstanceToPublic)
    .where('Document.active', true)
    .where('Document.type', OPENCTI_INTEGRATION_DOCUMENT_TYPE)
    .whereNotNull('Document.slug')
    .whereNotNull('Document.name')
    .modify(applyDecouplingRestriction(OPENCTI_INTEGRATION_DOCUMENT_TYPE))
    .modify(excludeChildDocuments);

  if (request.integrationTypes.length > 0) {
    query.whereExists(function () {
      this.select(dbRaw('1'))
        .from('Document_Metadata as integrationTypeMetadata')
        .whereRaw('"integrationTypeMetadata"."document_id" = "Document"."id"')
        .andWhere(
          'integrationTypeMetadata.key',
          DocumentMetadataKeyCode.IntegrationType
        )
        .whereIn('integrationTypeMetadata.value', request.integrationTypes);
    });
  }

  if (IntegrationCoverageSearchHelper.hasRequestedFacets(request)) {
    // Equivalent to "score > 0": at least one requested value is covered.
    query.where((overlap) => {
      for (const family of COVERAGE_FAMILIES) {
        const values =
          family === 'regions' && request.regions.length > 0
            ? IntegrationCoverageSearchHelper.buildRegionMatchKeys(
                request.regions
              )
            : request[family];
        if (values.length === 0) continue;
        overlap.orWhere((familyOverlap) => {
          whereMetadataListContainsAny(
            familyOverlap,
            COVERAGE_METADATA_KEY_BY_FAMILY[family],
            values
          );
        });
      }
    });
  }

  await applySearch('Document', query, request.searchTerm, true);
  return { query };
};

const loadCandidateRows = async (
  query: Knex.QueryBuilder
): Promise<CoverageCandidateRow[]> =>
  query
    .clone()
    .select(
      'Document.id',
      'Document.name',
      'Document.slug',
      'Document.short_description'
    )
    .orderBy('Document.name', 'asc')
    .orderBy('Document.id', 'asc')
    .limit(COVERAGE_SEARCH_MAX_CANDIDATES);

export const IntegrationCoverageDomain = {
  loadCandidatesAndFacets: async (
    request: CoverageSearchRequest
  ): Promise<{ candidates: CoverageCandidateRow[]; facets: Facet }> => {
    const { query } = await buildCandidatesQuery(request);
    const documentIdsQuery = query.clone().select('Document.id');

    const [
      rows,
      metadataBuckets,
      useCaseBuckets,
      solutionCategoryBuckets,
      entityTypeBuckets,
      objectTypeBuckets,
      sectorBuckets,
      regionBuckets,
    ] = await Promise.all([
      loadCandidateRows(query),
      loadMetadataFacetBucketsGrouped(documentIdsQuery, FACET_METADATA_KEYS),
      loadUseCaseFacetBuckets(documentIdsQuery),
      loadSolutionCategoryFacetBuckets(documentIdsQuery),
      loadMetadataListFacetBuckets(
        documentIdsQuery,
        DocumentMetadataKeyCode.EntityTypes
      ),
      loadMetadataListFacetBuckets(
        documentIdsQuery,
        DocumentMetadataKeyCode.CoveredObjectTypes
      ),
      loadMetadataListFacetBuckets(
        documentIdsQuery,
        DocumentMetadataKeyCode.CoveredSectors
      ),
      loadMetadataListFacetBuckets(
        documentIdsQuery,
        DocumentMetadataKeyCode.CoveredRegions
      ),
    ]);

    const candidates = await DocumentMetadataDomain.hydrateMetadata(
      rows,
      CANDIDATE_METADATA_KEYS
    );

    return {
      candidates,
      facets: {
        integration_type:
          metadataBuckets[DocumentMetadataKeyCode.IntegrationType] ?? [],
        license_type:
          metadataBuckets[DocumentMetadataKeyCode.LicenseType] ?? [],
        manager_supported:
          metadataBuckets[DocumentMetadataKeyCode.ManagerSupported] ?? [],
        verified: metadataBuckets[DocumentMetadataKeyCode.Verified] ?? [],
        product_version:
          metadataBuckets[DocumentMetadataKeyCode.ProductVersion] ?? [],
        use_case: useCaseBuckets,
        solution_category: solutionCategoryBuckets,
        entity_type: entityTypeBuckets,
        object_type: objectTypeBuckets,
        sector: sectorBuckets,
        region: regionBuckets,
      },
    };
  },

  loadStoredCoverage: async (
    documentId: DocumentId
  ): Promise<StoredIntegrationCoverage | null> => {
    const hydrated = await DocumentMetadataDomain.hydrateMetadataOne<
      { id: string } & Partial<Record<DocumentMetadataKeyCode, unknown>>
    >({ id: documentId }, COVERAGE_METADATA_KEYS);
    return hydrated
      ? IntegrationCoverageHelper.parseStoredCoverage(hydrated)
      : null;
  },

  loadUseCaseNamesByIds: async (ids: readonly string[]): Promise<string[]> => {
    if (ids.length === 0) return [];
    const rows: Pick<UseCase, 'name'>[] = await db<UseCase>('UseCase')
      .whereIn('id', ids)
      .select('name');
    return rows.map(({ name }) => name);
  },

  loadSolutionCategoryNamesByIds: async (
    ids: readonly string[]
  ): Promise<string[]> => {
    if (ids.length === 0) return [];
    const rows: Pick<SolutionCategory, 'name'>[] = await db<SolutionCategory>(
      'SolutionCategory'
    )
      .whereIn('id', ids)
      .select('name');
    return rows.map(({ name }) => name);
  },

  loadUseCaseNamesByDocumentIds: async (
    documentIds: readonly string[]
  ): Promise<Map<string, string[]>> => {
    if (documentIds.length === 0) return new Map();
    return groupNamesByDocumentId(
      await useCaseDomain.buildUseCasesByDocumentIdQuery(documentIds)
    );
  },

  loadSolutionCategoryNamesByDocumentIds: async (
    documentIds: readonly string[]
  ): Promise<Map<string, string[]>> => {
    if (documentIds.length === 0) return new Map();
    return groupNamesByDocumentId(
      await solutionCategoryDomain.buildSolutionCategoriesByDocumentIdQuery(
        documentIds
      )
    );
  },

  /** Every parent integration whose coverage is not declared, in id order (keyset pagination). */
  loadIntegrationsWithoutDeclaredCoverage: async ({
    afterId,
    limit,
  }: {
    afterId?: string;
    limit: number;
  }): Promise<CoverageInferenceRow[]> => {
    const rows: CoverageInferenceRow[] = await db<Document>('Document')
      .select(
        'Document.id',
        'Document.name',
        'Document.short_description',
        'Document.description'
      )
      .where('Document.type', OPENCTI_INTEGRATION_DOCUMENT_TYPE)
      .modify(excludeChildDocuments)
      .whereNotExists(function () {
        this.select(dbRaw('1'))
          .from('Document_Metadata as coverageInferredMetadata')
          .whereRaw(
            '"coverageInferredMetadata"."document_id" = "Document"."id"'
          )
          .andWhere(
            'coverageInferredMetadata.key',
            DocumentMetadataKeyCode.CoverageInferred
          )
          .andWhere('coverageInferredMetadata.value', 'false');
      })
      .modify((builder) => {
        if (afterId) {
          builder.where('Document.id', '>', afterId);
        }
      })
      .orderBy('Document.id', 'asc')
      .limit(limit);

    return DocumentMetadataDomain.hydrateMetadata(rows, COVERAGE_METADATA_KEYS);
  },

  upsertCoverageMetadata: async (
    updates: Array<{
      documentId: string;
      coverage: StoredIntegrationCoverage;
    }>
  ): Promise<void> => {
    if (updates.length === 0) return;
    const rows: DocumentMetadata[] = updates.flatMap(
      ({ documentId, coverage }) =>
        IntegrationCoverageHelper.toMetadataEntries(coverage).map(
          ({ key, value }) => ({
            document_id: documentId as DocumentId,
            key: key as DocumentMetadataKey,
            value,
          })
        )
    );
    await db<DocumentMetadata>('Document_Metadata')
      .insert(rows)
      .onConflict(['document_id', 'key'])
      .merge(['value']);
  },
};
