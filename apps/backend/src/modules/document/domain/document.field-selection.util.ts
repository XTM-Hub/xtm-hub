import { GraphQLResolveInfo, Kind, SelectionSetNode } from 'graphql';
import { DocumentMetadataKeyCode } from '../../../__generated__/resolvers-types';

/**
 * PROTOTYPE: derives the minimal set of `Document` table columns a GraphQL
 * selection actually needs by walking `GraphQLResolveInfo`, instead of
 * maintaining a second hand-written query/type (compare with
 * `DocumentDomain.buildSeoDocumentsByServiceSlugQuery`'s `columns` param and
 * `publicDocumentSlugsByServiceSlug`, the dedicated lightweight query this explores
 * replacing).
 */

// Always selected regardless of the requested fields:
//  - `id` backs every id-keyed DataLoader (uploader, use_cases, children_documents,
//    solution_categories, ...) and is the pivot key `DocumentMetadataDomain.hydrateMetadata`
//    joins `Document_Metadata` on, even when no metadata-backed field was requested.
//  - `type` is read by `Document.__resolveType`, which GraphQL always invokes for an
//    interface-typed result (`Document`, `Integration`) regardless of the selection.
const ALWAYS_REQUIRED_COLUMNS = ['id', 'type'];

// GraphQL fields backed 1:1 by a same-named column on the `Document` table (see
// `model/kanel/public/Document.ts` for the authoritative column list).
const DIRECT_COLUMN_FIELDS: Record<string, string> = {
  id: 'id',
  type: 'type',
  name: 'name',
  short_description: 'short_description',
  description: 'description',
  file_name: 'file_name',
  active: 'active',
  created_at: 'created_at',
  updated_at: 'updated_at',
  updater_id: 'updater_id',
  slug: 'slug',
  service_instance_id: 'service_instance_id',
  remover_id: 'remover_id',
};

// GraphQL relation/list fields resolved through a DataLoader (see
// `document.dataloader.ts`) or an override resolver (see `document.resolver.ts` and
// `integration.resolver.ts`): each needs the column(s) that key that loader, not a
// same-named column.
const DEPENDENT_COLUMN_FIELDS: Record<string, string[]> = {
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
const NO_COLUMN_FIELDS = new Set<string>([
  'download_number',
  'share_number',
  ...Object.values(DocumentMetadataKeyCode).filter(
    (key) => key !== DocumentMetadataKeyCode.SolutionCategories
  ),
]);

// GraphQL meta-field, never backed by application data.
const IGNORED_FIELDS = new Set(['__typename']);

export class UnmappedDocumentFieldError extends Error {
  constructor(fieldName: string) {
    super(
      `getRequestedDocumentColumns: no column mapping registered for Document field "${fieldName}". ` +
        'Add it to DIRECT_COLUMN_FIELDS, DEPENDENT_COLUMN_FIELDS or NO_COLUMN_FIELDS in ' +
        'document.field-selection.util.ts before it can be safely selected — refusing to silently drop data.'
    );
    this.name = 'UnmappedDocumentFieldError';
  }
}

// Walks a selection set, recursing into inline fragments (`... on Connector { ... }`)
// and fragment spreads (`...SomeFragment`) so type-specific fields on concrete
// `Document` implementations are captured alongside the shared interface fields.
// Does NOT recurse into a field's own nested selection set (e.g. `service_instance { id }`)
// since that describes a different GraphQL type, not a `Document` column.
function collectFieldNames(
  selectionSet: SelectionSetNode | undefined,
  fragments: GraphQLResolveInfo['fragments'],
  out: Set<string>,
  visitedFragments: Set<string>
): void {
  if (!selectionSet) return;

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      out.add(selection.name.value);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      collectFieldNames(
        selection.selectionSet,
        fragments,
        out,
        visitedFragments
      );
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const fragmentName = selection.name.value;
      if (visitedFragments.has(fragmentName)) continue; // guard against fragment cycles
      visitedFragments.add(fragmentName);

      const fragment = fragments[fragmentName];
      if (!fragment) continue;
      collectFieldNames(
        fragment.selectionSet,
        fragments,
        out,
        visitedFragments
      );
    }
  }
}

/**
 * Derives the minimal list of `Document.<column>` selectors needed to satisfy every
 * field the client selected on a `Document`-typed (or `[Document!]!`-typed) result,
 * across all inline fragments / fragment spreads for concrete implementing types
 * (`Integration`, `Connector`, `CsvFeed`, `CustomView`, ...).
 *
 * Throws `UnmappedDocumentFieldError` for any requested field with no registered
 * mapping rather than silently returning `null` for real data.
 */
export function getRequestedDocumentColumns(
  info: GraphQLResolveInfo
): string[] {
  const requestedFields = new Set<string>();
  for (const fieldNode of info.fieldNodes) {
    collectFieldNames(
      fieldNode.selectionSet,
      info.fragments,
      requestedFields,
      new Set()
    );
  }

  const columns = new Set<string>(ALWAYS_REQUIRED_COLUMNS);

  for (const field of requestedFields) {
    if (IGNORED_FIELDS.has(field) || NO_COLUMN_FIELDS.has(field)) continue;

    const directColumn = DIRECT_COLUMN_FIELDS[field];
    if (directColumn) {
      columns.add(directColumn);
      continue;
    }

    const dependentColumns = DEPENDENT_COLUMN_FIELDS[field];
    if (dependentColumns) {
      dependentColumns.forEach((column) => columns.add(column));
      continue;
    }

    throw new UnmappedDocumentFieldError(field);
  }

  return Array.from(columns).map((column) => `Document.${column}`);
}
