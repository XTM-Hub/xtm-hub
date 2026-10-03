import { DocumentMetadataKeyCode } from '../../../__generated__/resolvers-types';
import DocumentModel from '../../../model/kanel/public/Document';
import {
  ColumnProjectionConfig,
  createColumnProjector,
  UnmappedFieldError,
} from '../../../utils/graphql-field-projection.util';

/**
 * PROTOTYPE: derives the minimal set of `Document` table columns a GraphQL
 * selection actually needs, using the generic `createColumnProjector` (see
 * `utils/graphql-field-projection.util.ts`) instead of maintaining a second
 * hand-written query/type (compare with
 * `DocumentDomain.buildSeoDocumentsByServiceSlugQuery`'s `columns` param and
 * `publicDocumentSlugsByServiceSlug`, the dedicated lightweight query this
 * explores replacing). Only this file's config is Document-specific; the
 * selection-walking logic is shared with any other module that adopts the
 * same pattern.
 */

export { UnmappedFieldError as UnmappedDocumentFieldError };

// Every real column on the `Document` table (see `model/kanel/public/Document.ts`,
// the kanel-generated source of truth) — a same-named GraphQL field maps to it 1:1.
const DOCUMENT_COLUMNS = [
  'id',
  'uploader_id',
  'service_instance_id',
  'description',
  'file_name',
  'minio_name',
  'active',
  'created_at',
  'remover_id',
  'mime_type',
  'name',
  'updated_at',
  'updater_id',
  'short_description',
  'slug',
  'uploader_organization_id',
  'type',
  'source_type',
  'is_decommissioned',
  'version',
  'tags',
] as const satisfies readonly (keyof DocumentModel)[];

// Compile-time guard: fails the build if `model/kanel/public/Document.ts` gains a
// column that isn't reflected in DOCUMENT_COLUMNS above (the `satisfies` clause only
// catches typos/stale entries in the other direction). Keeps the maintenance cost of
// this hand-maintained list bounded to "TypeScript won't compile", not a silent gap.
type MissingDocumentColumns = Exclude<
  keyof DocumentModel,
  (typeof DOCUMENT_COLUMNS)[number]
>;
type _AssertNoMissingDocumentColumns = MissingDocumentColumns extends never
  ? true
  : ['DOCUMENT_COLUMNS is missing Document column(s):', MissingDocumentColumns];
const _assertNoMissingDocumentColumns: _AssertNoMissingDocumentColumns = true;
void _assertNoMissingDocumentColumns;

// Always selected regardless of the requested fields:
//  - `id` backs every id-keyed DataLoader (uploader, use_cases, children_documents,
//    solution_categories, ...) and is the pivot key `DocumentMetadataDomain.hydrateMetadata`
//    joins `Document_Metadata` on, even when no metadata-backed field was requested.
//  - `type` is read by `Document.__resolveType`, which GraphQL always invokes for an
//    interface-typed result (`Document`, `Integration`) regardless of the selection.
const ALWAYS_REQUIRED_COLUMNS = ['id', 'type'];

// GraphQL relation/list fields resolved through a DataLoader (see
// `document.dataloader.ts`) or an override resolver (see `document.resolver.ts` and
// `integration.resolver.ts`): each needs the column(s) that key that loader, not a
// same-named column.
const DEPENDENT_COLUMN_FIELDS: ColumnProjectionConfig['dependentColumnFields'] =
  {
    uploader: ['id'],
    uploader_organization: ['id'],
    use_cases: ['id'],
    solution_categories: ['id'],
    children_documents: ['id'],
    service_instance: ['service_instance_id'],
    subscription: ['service_instance_id'],
  };

// Fields that never need a raw `Document` column for this query path:
//  - `download_number`/`share_number` are Elasticsearch telemetry counters, only
//    computed for single-document loads (`DocumentHelper.updateDocumentWithCounters`);
//    list queries such as `publicDocumentsByServiceSlug` never populate them today,
//    with or without this optimization, so no column is missing either way.
//  - every `DocumentMetadataKeyCode` value (except `solution_categories`, which is
//    overridden by a DataLoader — see DEPENDENT_COLUMN_FIELDS) is hydrated *after*
//    the SQL query runs by `DocumentMetadataDomain.hydrateMetadata`, keyed by
//    `Document.id` against the separate `Document_Metadata` table, and is completely
//    decoupled from the `Document.*` column list.
const NO_COLUMN_FIELDS: string[] = [
  'download_number',
  'share_number',
  ...Object.values(DocumentMetadataKeyCode).filter(
    (key) => key !== DocumentMetadataKeyCode.SolutionCategories
  ),
];

/**
 * Derives the minimal list of `Document.<column>` selectors needed to satisfy every
 * field the client selected on a `Document`-typed (or `[Document!]!`-typed) result,
 * across all inline fragments / fragment spreads for concrete implementing types
 * (`Integration`, `Connector`, `CsvFeed`, `CustomView`, ...).
 *
 * Throws `UnmappedDocumentFieldError` for any requested field with no registered
 * mapping rather than silently returning `null` for real data.
 */
export const getRequestedDocumentColumns = createColumnProjector({
  table: 'Document',
  columns: DOCUMENT_COLUMNS,
  alwaysRequiredColumns: ALWAYS_REQUIRED_COLUMNS,
  dependentColumnFields: DEPENDENT_COLUMN_FIELDS,
  noColumnFields: NO_COLUMN_FIELDS,
});
