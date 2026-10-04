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
  FiligranProduct,
} from '../../../../../__generated__/resolvers-types';
import { databaseContext } from '../../../../../context/database.context';
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
  loadEntityTypeFacetBuckets,
  loadMetadataFacetBucketsGrouped,
  loadMetadataListFacetBuckets,
  loadSolutionCategoryFacetBuckets,
  loadUseCaseFacetBuckets,
} from '../../../../document/facet/facet.queries';
import { solutionCategoryDomain } from '../../../../solution-category/solution-category.domain';
import {
  buildSolutionCategoryIndex,
  resolveSolutionCategoryNames,
} from '../../../../solution-category/solution-category.utils';
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
    // One extra row tells whether the candidate population was truncated
    .limit(COVERAGE_SEARCH_MAX_CANDIDATES + 1);

export const EMPTY_COVERAGE_FACETS: Facet = {
  integration_type: [],
  license_type: [],
  manager_supported: [],
  verified: [],
  product_version: [],
  use_case: [],
  solution_category: [],
  entity_type: [],
  object_type: [],
  sector: [],
  region: [],
};

// One aggregation at a time: a public request never holds more than one pooled connection
const loadFacets = async (
  documentIdsQuery: Knex.QueryBuilder
): Promise<Facet> => {
  const metadataBuckets = await loadMetadataFacetBucketsGrouped(
    documentIdsQuery,
    FACET_METADATA_KEYS
  );
  const useCaseBuckets = await loadUseCaseFacetBuckets(documentIdsQuery);
  const solutionCategoryBuckets =
    await loadSolutionCategoryFacetBuckets(documentIdsQuery);
  const entityTypeBuckets = await loadEntityTypeFacetBuckets(documentIdsQuery);
  const objectTypeBuckets = await loadMetadataListFacetBuckets(
    documentIdsQuery,
    DocumentMetadataKeyCode.CoveredObjectTypes
  );
  const sectorBuckets = await loadMetadataListFacetBuckets(
    documentIdsQuery,
    DocumentMetadataKeyCode.CoveredSectors
  );
  const regionBuckets = await loadMetadataListFacetBuckets(
    documentIdsQuery,
    DocumentMetadataKeyCode.CoveredRegions
  );
  return {
    integration_type:
      metadataBuckets[DocumentMetadataKeyCode.IntegrationType] ?? [],
    license_type: metadataBuckets[DocumentMetadataKeyCode.LicenseType] ?? [],
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
  };
};

export interface LinkableVocabulary {
  useCaseNames: ReadonlySet<string>;
  solutionCategories: SolutionCategory[];
}

export const IntegrationCoverageDomain = {
  /**
   * Ranked candidates of a coverage search and, when the caller selects
   * them, the facets of the candidate population (seven aggregations, one after the other).
   */
  loadCandidatesAndFacets: async (
    request: CoverageSearchRequest,
    { withFacets = true }: { withFacets?: boolean } = {}
  ): Promise<{
    candidates: CoverageCandidateRow[];
    facets: Facet;
    truncated: boolean;
  }> => {
    const { query } = await buildCandidatesQuery(request);

    const rows = await loadCandidateRows(query);
    const facets = withFacets
      ? await loadFacets(query.clone().select('Document.id'))
      : EMPTY_COVERAGE_FACETS;

    const truncated = rows.length > COVERAGE_SEARCH_MAX_CANDIDATES;
    const candidates = await DocumentMetadataDomain.hydrateMetadata(
      rows.slice(0, COVERAGE_SEARCH_MAX_CANDIDATES),
      CANDIDATE_METADATA_KEYS
    );

    return { truncated, candidates, facets };
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

  /**
   * Text the coverage inference falls back to, read after locking the
   * document row: an update never infers from a name or description that a
   * concurrent update replaced after it first read the document. Must run
   * inside `databaseContext.withTransaction`.
   */
  loadInferenceTextForUpdate: async (
    documentId: DocumentId
  ): Promise<
    Pick<Document, 'name' | 'short_description' | 'description'> | undefined
  > =>
    db<Document>('Document')
      .where('id', documentId)
      .select('name', 'short_description', 'description')
      .forUpdate()
      .first(),

  loadUseCaseNamesByIds: async (ids: readonly string[]): Promise<string[]> => {
    if (ids.length === 0) return [];
    const rows: Pick<UseCase, 'name'>[] = await db<UseCase>('UseCase')
      .whereIn('id', ids)
      .select('name');
    return rows.map(({ name }) => name);
  },

  /** The use cases and solution categories the document linkers resolve names against, loaded once per ingestion. */
  loadLinkableVocabulary: async (): Promise<LinkableVocabulary> => {
    const useCases: Pick<UseCase, 'name'>[] =
      await db<UseCase>('UseCase').select('name');
    return {
      // The use case linker matches names case-insensitively
      useCaseNames: new Set(useCases.map(({ name }) => name.toLowerCase())),
      solutionCategories:
        await solutionCategoryDomain.loadAllSolutionCategories(),
    };
  },

  /**
   * The use case and solution category names the document linkers resolve: an unknown name is dropped by the
   * upsert, so coverage is never inferred from it. Without a product, no solution category is linked.
   */
  keepLinkableNames: (
    vocabulary: LinkableVocabulary,
    {
      useCases,
      solutionCategories,
      product = FiligranProduct.Opencti,
    }: {
      useCases: readonly string[];
      solutionCategories: readonly string[];
      product?: FiligranProduct | null;
    }
  ): { use_cases: string[]; solution_categories: string[] } => {
    const linkableUseCases = useCases.filter((name) =>
      vocabulary.useCaseNames.has(name.toLowerCase())
    );
    if (solutionCategories.length === 0 || !product) {
      return { use_cases: linkableUseCases, solution_categories: [] };
    }
    const index = buildSolutionCategoryIndex(
      vocabulary.solutionCategories,
      product
    );
    const unknown = new Set(
      resolveSolutionCategoryNames(solutionCategories, index).unknown
    );
    return {
      use_cases: linkableUseCases,
      solution_categories: solutionCategories.filter(
        (name) => !unknown.has(name)
      ),
    };
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

  /**
   * Every parent integration whose coverage is not declared, in id order (keyset pagination),
   * optionally restricted to the given documents.
   */
  loadIntegrationsWithoutDeclaredCoverage: async ({
    afterId,
    documentIds,
    limit,
  }: {
    afterId?: string;
    documentIds?: readonly string[];
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
        if (documentIds) {
          builder.whereIn('Document.id', documentIds);
        }
      })
      .orderBy('Document.id', 'asc')
      .limit(limit);

    return DocumentMetadataDomain.hydrateMetadata(rows, COVERAGE_METADATA_KEYS);
  },

  /**
   * Writes refreshed inferred coverage. The candidate documents are locked, then
   * read again in the same transaction: a document deleted or declared since the
   * refresh read its batch is dropped, and `inferUpdates` runs on the current,
   * lock-protected rows, so a stale batch never overwrites a declaration or a
   * newer inference. Returns the number of documents written.
   */
  writeInferredCoverage: async (
    documentIds: readonly string[],
    inferUpdates: (rows: CoverageInferenceRow[]) => Promise<
      Array<{
        documentId: string;
        coverage: StoredIntegrationCoverage;
      }>
    >
  ): Promise<number> => {
    if (documentIds.length === 0) return 0;
    return databaseContext.withTransaction(async () => {
      const lockedRows: Pick<Document, 'id'>[] = await db<Document>('Document')
        .whereIn('id', documentIds)
        .select('id')
        .forUpdate();
      if (lockedRows.length === 0) return 0;
      const currentRows =
        await IntegrationCoverageDomain.loadIntegrationsWithoutDeclaredCoverage(
          {
            documentIds: lockedRows.map(({ id }) => id),
            limit: lockedRows.length,
          }
        );
      const currentIds = new Set<string>(currentRows.map(({ id }) => id));
      const writable = (await inferUpdates(currentRows)).filter(
        ({ documentId, coverage }) =>
          coverage.inferred && currentIds.has(documentId)
      );
      await IntegrationCoverageDomain.upsertCoverageMetadata(writable);
      return writable.length;
    });
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
