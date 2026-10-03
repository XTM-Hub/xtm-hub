import { GraphQLResolveInfo, Kind, SelectionSetNode } from 'graphql';

/**
 * Generic, reusable core for deriving the minimal SQL columns a GraphQL
 * selection needs, instead of always `SELECT *`-ing a table and hydrating
 * fields nobody asked for. Walks `GraphQLResolveInfo` selections - including
 * inline fragments (`... on ConcreteType { ... }`) and fragment spreads - so it
 * also works for GraphQL interfaces/unions backed by a single table with
 * type-specific fields (see `modules/document/domain/document.field-selection.util.ts`
 * for a worked example wiring this up for the `Document` interface).
 *
 * Any module wanting the same optimization for its own table only needs to
 * declare a small `ColumnProjectionConfig` via `createColumnProjector` - the
 * selection-walking logic below (the tricky, error-prone part) is shared.
 */

// Walks a selection set, recursing into inline fragments and fragment spreads,
// collecting every requested GraphQL field name. Does NOT recurse into a
// field's own nested selection set (e.g. `service_instance { id }`), since
// that describes a different GraphQL type, not a column on this table.
function collectRequestedFieldNames(
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
      collectRequestedFieldNames(
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
      collectRequestedFieldNames(
        fragment.selectionSet,
        fragments,
        out,
        visitedFragments
      );
    }
  }
}

/**
 * Extracts every GraphQL field name requested on a resolver's return type,
 * across all inline fragments / fragment spreads reachable from `info.fieldNodes`.
 * Ignores the `__typename` meta-field.
 */
export function getRequestedGraphQLFields(
  info: GraphQLResolveInfo
): Set<string> {
  const requestedFields = new Set<string>();
  for (const fieldNode of info.fieldNodes) {
    collectRequestedFieldNames(
      fieldNode.selectionSet,
      info.fragments,
      requestedFields,
      new Set()
    );
  }
  requestedFields.delete('__typename');
  return requestedFields;
}

export class UnmappedFieldError extends Error {
  constructor(table: string, fieldName: string) {
    super(
      `getRequestedColumns(${table}): no column mapping registered for field "${fieldName}". ` +
        "Add it to the table's columns, dependentColumnFields, or noColumnFields " +
        'before it can be safely selected — refusing to silently drop data.'
    );
    this.name = 'UnmappedFieldError';
  }
}

export interface ColumnProjectionConfig {
  /** Table name used to prefix returned columns, e.g. `Document.id`. */
  table: string;
  /** Every real column on `table` — a same-named GraphQL field maps to it 1:1. */
  columns: readonly string[];
  /** Always included, regardless of the requested fields (e.g. primary key, type discriminant). */
  alwaysRequiredColumns?: readonly string[];
  /** Relation/list fields resolved via a DataLoader or override resolver: field -> column(s) that key it. */
  dependentColumnFields?: Record<string, readonly string[]>;
  /** Fields that never need a raw column here (e.g. hydrated separately from another table/source). */
  noColumnFields?: ReadonlySet<string> | readonly string[];
}

/**
 * Builds a `getRequestedColumns(info)` function for a given table/type from a
 * declarative config, instead of every module re-implementing the selection
 * walk. Only `columns` / `dependentColumnFields` / `noColumnFields` are
 * domain-specific; everything else (fragment handling, throwing on unmapped
 * fields) is shared.
 *
 * Throws `UnmappedFieldError` for any requested field matching none of
 * `columns`, `dependentColumnFields` or `noColumnFields`, rather than silently
 * returning `null` for real data.
 */
export function createColumnProjector({
  table,
  columns,
  alwaysRequiredColumns = [],
  dependentColumnFields = {},
  noColumnFields = [],
}: ColumnProjectionConfig): (info: GraphQLResolveInfo) => string[] {
  const knownColumns = new Set(columns);
  const noColumnFieldsSet = new Set(noColumnFields);

  return (info: GraphQLResolveInfo): string[] => {
    const requestedFields = getRequestedGraphQLFields(info);
    const result = new Set<string>(alwaysRequiredColumns);

    for (const field of requestedFields) {
      if (noColumnFieldsSet.has(field)) continue;

      if (knownColumns.has(field)) {
        result.add(field);
        continue;
      }

      const dependentColumns = dependentColumnFields[field];
      if (dependentColumns) {
        dependentColumns.forEach((column) => result.add(column));
        continue;
      }

      throw new UnmappedFieldError(table, field);
    }

    return Array.from(result).map((column) => `${table}.${column}`);
  };
}
