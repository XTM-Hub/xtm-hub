import { applyLogicalFilter, db, dbRaw } from '../../../../knexfile';
import {
  DocumentMetadataKeyCode,
  FacetBucket,
  LoadDocumentFacetInput,
} from '../../../__generated__/resolvers-types';
import type Document from '../../../model/kanel/public/Document';
import {
  restrictDocumentToAccessibleServiceInstance,
  restrictDocumentToActive,
} from '../../../security/restriction/document';
import {
  applyDecouplingRestriction,
  applyDecouplingRestrictionForMixedTypes,
} from '../domain/document.domain';

export type FacetRow = {
  value: string;
  count: string | number;
};
export type DocumentIdsQuery = ReturnType<typeof db<Document>>;

export const toFacetBuckets = (rows: FacetRow[]): FacetBucket[] =>
  rows.map(({ value, count }) => ({
    value,
    count: Number(count),
  }));

export const buildScopedDocumentIdsQuery = (
  { serviceInstanceId, documentType, logicalFilters }: LoadDocumentFacetInput,
  restrictToActive: boolean
) => {
  const query = db<Document>('Document')
    .select('Document.id')
    .tap(restrictDocumentToAccessibleServiceInstance)
    .modify((builder) => {
      if (restrictToActive) {
        restrictDocumentToActive(builder);
      }
    })
    .where('Document.service_instance_id', '=', serviceInstanceId)
    .modify((builder) => {
      if (documentType != null) {
        builder.where('Document.type', '=', documentType);
        applyDecouplingRestriction(documentType)(builder);
      } else {
        applyDecouplingRestrictionForMixedTypes(builder);
      }
    })
    .whereNotExists(function () {
      this.select(dbRaw('1'))
        .from('Document_Children')
        .whereRaw('"Document_Children"."child_document_id" = "Document"."id"');
    })
    .groupBy('Document.id');

  applyLogicalFilter('Document', query, logicalFilters ?? undefined);
  return query;
};

export const loadMetadataFacetBucketsGrouped = async (
  documentIdsQuery: DocumentIdsQuery,
  keys: DocumentMetadataKeyCode[]
): Promise<Record<string, FacetBucket[]>> => {
  if (keys.length === 0) {
    return {};
  }

  const rows = (await db('Document_Metadata')
    .from('Document_Metadata as metadata')
    .select('metadata.key as key', 'metadata.value as value')
    .countDistinct({ count: 'metadata.document_id' })
    .whereIn('metadata.key', keys)
    .whereNotNull('metadata.value')
    .whereIn('metadata.document_id', documentIdsQuery.clone())
    .groupBy(['metadata.key', 'metadata.value'])
    .orderBy('metadata.key', 'asc')
    .orderBy('count', 'desc')
    .orderBy('metadata.value', 'asc')) as Array<
    FacetRow & { key: DocumentMetadataKeyCode }
  >;

  const grouped = rows.reduce<Record<string, FacetRow[]>>((acc, row) => {
    const bucketKey = row.key;
    const current = acc[bucketKey] ?? [];
    current.push({ value: row.value, count: row.count });
    acc[bucketKey] = current;
    return acc;
  }, {});

  return Object.fromEntries(
    keys.map((key) => [key, toFacetBuckets(grouped[key] ?? [])] as const)
  );
};

export const loadUseCaseFacetBuckets = async (
  documentIdsQuery: DocumentIdsQuery
) => {
  const rows = (await db('Object_UseCase')
    .from('Object_UseCase as objectUseCase')
    .select('objectUseCase.use_case_id as value')
    .countDistinct({ count: 'objectUseCase.object_id' })
    .whereIn('objectUseCase.object_id', documentIdsQuery.clone())
    .groupBy('objectUseCase.use_case_id')
    .orderBy('count', 'desc')
    .orderBy('objectUseCase.use_case_id', 'asc')) as FacetRow[];

  return toFacetBuckets(rows);
};

export const loadSolutionCategoryFacetBuckets = async (
  documentIdsQuery: DocumentIdsQuery
) => {
  const rows = (await db('Object_SolutionCategory')
    .from('Object_SolutionCategory as objectSolutionCategory')
    .select('objectSolutionCategory.solution_category_id as value')
    .countDistinct({ count: 'objectSolutionCategory.object_id' })
    .whereIn('objectSolutionCategory.object_id', documentIdsQuery.clone())
    .groupBy('objectSolutionCategory.solution_category_id')
    .orderBy('count', 'desc')
    .orderBy(
      'objectSolutionCategory.solution_category_id',
      'asc'
    )) as FacetRow[];

  return toFacetBuckets(rows);
};

export const loadEntityTypeFacetBuckets = async (
  documentIdsQuery: DocumentIdsQuery
) => {
  const rows = (await db('Document_Metadata')
    .from('Document_Metadata as metadata')
    .joinRaw(
      'CROSS JOIN LATERAL jsonb_array_elements_text("metadata"."value"::jsonb) as entity(value)'
    )
    .select('entity.value as value')
    .countDistinct({ count: 'metadata.document_id' })
    .where('metadata.key', '=', DocumentMetadataKeyCode.EntityTypes)
    .whereNotNull('metadata.value')
    .whereIn('metadata.document_id', documentIdsQuery.clone())
    .groupBy('entity.value')
    .orderBy('count', 'desc')
    .orderBy('entity.value', 'asc')) as FacetRow[];

  return toFacetBuckets(rows);
};
