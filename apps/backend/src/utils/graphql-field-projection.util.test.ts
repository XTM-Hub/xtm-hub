import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  Kind,
  parse,
} from 'graphql';
import { describe, expect, it } from 'vitest';
import {
  createColumnProjector,
  getRequestedGraphQLFields,
  UnmappedFieldError,
} from './graphql-field-projection.util';

/**
 * Builds a minimal `GraphQLResolveInfo` stub from a real GraphQL query string,
 * parsed with `graphql`'s own `parse()`, so the walker under test is exercised
 * against exactly what Apollo would hand a resolver.
 */
function buildResolveInfo(query: string): GraphQLResolveInfo {
  const document = parse(query);

  const fragments: Record<string, FragmentDefinitionNode> = {};
  let rootFieldNode: FieldNode | undefined;

  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments[definition.name.value] = definition;
    } else if (definition.kind === Kind.OPERATION_DEFINITION) {
      const [firstSelection] = definition.selectionSet.selections;
      if (firstSelection?.kind === Kind.FIELD) {
        rootFieldNode = firstSelection;
      }
    }
  }

  if (!rootFieldNode) {
    throw new Error('Test query must have a root field selection');
  }

  return {
    fieldNodes: [rootFieldNode],
    fragments,
  } as GraphQLResolveInfo;
}

describe('getRequestedGraphQLFields', () => {
  it('collects flat field selections', () => {
    const info = buildResolveInfo(`
      query { widget(id: "x") { id name } }
    `);

    expect(getRequestedGraphQLFields(info)).toEqual(new Set(['id', 'name']));
  });

  it('collects fields spread across inline fragments and fragment spreads, without duplication', () => {
    const info = buildResolveInfo(`
      query {
        widget(id: "x") {
          id
          ... on PremiumWidget { discount_rate }
          ...WidgetOwner
        }
      }
      fragment WidgetOwner on Widget {
        owner_id
      }
    `);

    expect(getRequestedGraphQLFields(info)).toEqual(
      new Set(['id', 'discount_rate', 'owner_id'])
    );
  });

  it('does not recurse into a field own nested selection set', () => {
    const info = buildResolveInfo(`
      query { widget(id: "x") { id owner { id name } } }
    `);

    expect(getRequestedGraphQLFields(info)).toEqual(new Set(['id', 'owner']));
  });

  it('ignores __typename', () => {
    const info = buildResolveInfo(`
      query { widget(id: "x") { __typename id } }
    `);

    expect(getRequestedGraphQLFields(info)).toEqual(new Set(['id']));
  });

  it('guards against fragment cycles instead of infinite-looping', () => {
    const info = buildResolveInfo(`
      query { widget(id: "x") { ...A } }
      fragment A on Widget { id ...B }
      fragment B on Widget { name ...A }
    `);

    expect(getRequestedGraphQLFields(info)).toEqual(new Set(['id', 'name']));
  });
});

// Toy, non-Document config proving `createColumnProjector` is genuinely
// reusable: any module can adopt the same optimization by declaring a
// `ColumnProjectionConfig` for its own table instead of reimplementing the
// selection-walking logic.
const getRequestedWidgetColumns = createColumnProjector({
  table: 'Widget',
  columns: ['id', 'name', 'price', 'owner_id'],
  alwaysRequiredColumns: ['id'],
  dependentColumnFields: { owner: ['owner_id'] },
  noColumnFields: ['discount_rate'],
});

describe('createColumnProjector', () => {
  it('always includes alwaysRequiredColumns even when not requested', () => {
    const info = buildResolveInfo(`query { widget(id: "x") { name } }`);

    expect(new Set(getRequestedWidgetColumns(info))).toEqual(
      new Set(['Widget.id', 'Widget.name'])
    );
  });

  it('maps a dependent field to the column(s) that key its loader, not a same-named column', () => {
    const info = buildResolveInfo(`query { widget(id: "x") { owner { id } } }`);

    expect(new Set(getRequestedWidgetColumns(info))).toEqual(
      new Set(['Widget.id', 'Widget.owner_id'])
    );
  });

  it('does not add a column for a noColumnFields entry', () => {
    const info = buildResolveInfo(
      `query { widget(id: "x") { name discount_rate } }`
    );

    expect(new Set(getRequestedWidgetColumns(info))).toEqual(
      new Set(['Widget.id', 'Widget.name'])
    );
  });

  it('throws UnmappedFieldError for a field with no registered mapping', () => {
    const info = buildResolveInfo(
      `query { widget(id: "x") { totallyUnknownField } }`
    );

    expect(() => getRequestedWidgetColumns(info)).toThrow(UnmappedFieldError);
  });

  it('prefixes every returned column with the configured table name', () => {
    const info = buildResolveInfo(
      `query { widget(id: "x") { id name price } }`
    );

    for (const column of getRequestedWidgetColumns(info)) {
      expect(column.startsWith('Widget.')).toBe(true);
    }
  });
});
