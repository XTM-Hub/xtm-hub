import { Knex } from 'knex';
import {
  applyLogicalFilter,
  applySearch,
  database,
  db,
  dbRaw,
} from '../../../../knexfile';
import {
  FacetBucket,
  LoadDocumentFacetInput,
} from '../../../__generated__/resolvers-types';
import { databaseContext } from '../../../context/database.context';
import {
  FACET_SPECS,
  FacetField,
  FacetGroup,
  FacetSpec,
} from './facet.grouping.utils';
import { buildFacetBaseScopeQuery, FacetRow } from './facet.queries';

type FacetUnionRow = FacetRow & { facet: FacetField };

const selectIdsFromCte = (cteName: string): Knex.QueryBuilder =>
  database.queryBuilder().select('id').from(cteName);

const buildMetadataFacetBranch = (
  spec: FacetSpec,
  cteName: string
): Knex.QueryBuilder => {
  if (!spec.metadataKey) {
    throw new Error(`Facet spec "${spec.field}" is missing a metadataKey`);
  }

  return db('Document_Metadata')
    .from('Document_Metadata as metadata')
    .select(dbRaw('? as facet', [spec.field]), 'metadata.value as value')
    .count({ count: 'metadata.document_id' })
    .where('metadata.key', '=', spec.metadataKey)
    .whereNotNull('metadata.value')
    .whereIn('metadata.document_id', selectIdsFromCte(cteName))
    .groupBy('metadata.value')
    .orderBy('count', 'desc')
    .orderBy('metadata.value', 'asc');
};

const buildUseCaseFacetBranch = (
  spec: FacetSpec,
  cteName: string
): Knex.QueryBuilder =>
  db('Object_UseCase')
    .from('Object_UseCase as objectUseCase')
    .select(
      dbRaw('? as facet', [spec.field]),
      dbRaw('"objectUseCase"."use_case_id"::text as value')
    )
    .count({ count: 'objectUseCase.object_id' })
    .whereIn('objectUseCase.object_id', selectIdsFromCte(cteName))
    .groupBy('objectUseCase.use_case_id')
    .orderBy('count', 'desc')
    .orderBy('objectUseCase.use_case_id', 'asc');

const buildSolutionCategoryFacetBranch = (
  spec: FacetSpec,
  cteName: string
): Knex.QueryBuilder =>
  db('Object_SolutionCategory')
    .from('Object_SolutionCategory as objectSolutionCategory')
    .select(
      dbRaw('? as facet', [spec.field]),
      dbRaw('"objectSolutionCategory"."solution_category_id"::text as value')
    )
    .count({ count: 'objectSolutionCategory.object_id' })
    .whereIn('objectSolutionCategory.object_id', selectIdsFromCte(cteName))
    .groupBy('objectSolutionCategory.solution_category_id')
    .orderBy('count', 'desc')
    .orderBy('objectSolutionCategory.solution_category_id', 'asc');

const buildMetadataListFacetBranch = (
  spec: FacetSpec,
  cteName: string
): Knex.QueryBuilder => {
  if (!spec.metadataKey) {
    throw new Error(`Facet spec "${spec.field}" is missing a metadataKey`);
  }

  // Same buckets as loadMetadataListFacetBuckets: exact case for the entity types, case-insensitive for coverage.
  // The union needs the same column order in every branch: facet, value, count.
  const query = db('Document_Metadata')
    .from('Document_Metadata as metadata')
    .joinRaw(
      'CROSS JOIN LATERAL jsonb_array_elements_text("metadata"."value"::jsonb) as entity(value)'
    )
    .select(
      dbRaw('? as facet', [spec.field]),
      spec.exactCase
        ? 'entity.value as value'
        : dbRaw('MIN("entity"."value" COLLATE "C") as value')
    )
    .countDistinct({ count: 'metadata.document_id' })
    .where('metadata.key', '=', spec.metadataKey)
    .whereNotNull('metadata.value')
    .whereIn('metadata.document_id', selectIdsFromCte(cteName));
  return spec.exactCase
    ? query
        .groupBy('entity.value')
        .orderBy('count', 'desc')
        .orderBy('entity.value', 'asc')
    : query
        .groupByRaw('LOWER("entity"."value")')
        .orderBy('count', 'desc')
        .orderByRaw('MIN("entity"."value" COLLATE "C") COLLATE "default" asc');
};

const buildFacetBranch = (
  spec: FacetSpec,
  cteName: string
): Knex.QueryBuilder => {
  switch (spec.source) {
    case 'metadata':
      return buildMetadataFacetBranch(spec, cteName);
    case 'useCase':
      return buildUseCaseFacetBranch(spec, cteName);
    case 'solutionCategory':
      return buildSolutionCategoryFacetBranch(spec, cteName);
    case 'metadataList':
      return buildMetadataListFacetBranch(spec, cteName);
    default:
      throw new Error(`Unhandled facet source: ${String(spec.source)}`);
  }
};

const createUnionQueryBase = (): Knex.QueryBuilder => {
  const builder = database.queryBuilder();
  if (databaseContext.isInTransaction()) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    builder.transacting(databaseContext.getTransaction()!);
  }
  return builder;
};

const emptyFacetsByField = (): Record<FacetField, FacetBucket[]> =>
  Object.fromEntries(
    FACET_SPECS.map((spec) => [spec.field, [] as FacetBucket[]])
  ) as unknown as Record<FacetField, FacetBucket[]>;

const toFacetBucketsFromRows = (rows: FacetRow[]): FacetBucket[] =>
  rows.map(({ value, count }) => ({ value, count: Number(count) }));

const sortFacetRows = (rows: FacetRow[]): FacetRow[] =>
  [...rows].sort((a, b) => {
    const countDiff = Number(b.count) - Number(a.count);
    if (countDiff !== 0) return countDiff;
    if (a.value < b.value) return -1;
    if (a.value > b.value) return 1;
    return 0;
  });

export const loadFacetsInSingleQuery = async (
  groups: FacetGroup[],
  input: LoadDocumentFacetInput,
  restrictToActive: boolean
): Promise<Record<FacetField, FacetBucket[]>> => {
  const ctes: Array<{ name: string; query: Knex.QueryBuilder }> = [];
  const branches: Knex.QueryBuilder[] = [];

  const baseScopeCteName = 'facet_base_scope';
  const baseScopeQuery = buildFacetBaseScopeQuery(input, restrictToActive);
  await applySearch(
    'Document',
    baseScopeQuery,
    input.searchTerm ?? undefined,
    true
  );
  ctes.push({ name: baseScopeCteName, query: baseScopeQuery });

  for (const [index, group] of groups.entries()) {
    const cteName = `facet_scope_${index}`;
    const scopedQuery = createUnionQueryBase()
      .select('Document.id')
      .from({ Document: baseScopeCteName })
      .groupBy('Document.id');
    applyLogicalFilter('Document', scopedQuery, group.strippedFilter);
    ctes.push({ name: cteName, query: scopedQuery });

    for (const spec of group.specs) {
      branches.push(buildFacetBranch(spec, cteName));
    }
  }

  if (branches.length === 0) {
    return emptyFacetsByField();
  }

  let query = createUnionQueryBase().unionAll(branches, true);
  for (const cte of ctes) {
    query = query.withMaterialized(cte.name, cte.query);
  }

  const rows = (await query) as FacetUnionRow[];

  const rowsByField = new Map<FacetField, FacetRow[]>();
  for (const row of rows) {
    const bucket = rowsByField.get(row.facet) ?? [];
    bucket.push({ value: row.value, count: row.count });
    rowsByField.set(row.facet, bucket);
  }

  return Object.fromEntries(
    FACET_SPECS.map((spec) => [
      spec.field,
      toFacetBucketsFromRows(sortFacetRows(rowsByField.get(spec.field) ?? [])),
    ])
  ) as Record<FacetField, FacetBucket[]>;
};
