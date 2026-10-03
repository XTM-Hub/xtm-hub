import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  Kind,
  OperationDefinitionNode,
  parse,
} from 'graphql';
import { describe, expect, it } from 'vitest';
import { isFieldSelected } from './graphql-selection.util';

const resolveInfoOf = (
  query: string
): Pick<GraphQLResolveInfo, 'fieldNodes' | 'fragments'> => {
  const document = parse(query);
  const operation = document.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION
  );
  const fragments = Object.fromEntries(
    document.definitions
      .filter(
        (definition): definition is FragmentDefinitionNode =>
          definition.kind === Kind.FRAGMENT_DEFINITION
      )
      .map((fragment) => [fragment.name.value, fragment])
  );
  const fieldNodes = (operation?.selectionSet.selections ?? []).filter(
    (selection): selection is FieldNode => selection.kind === Kind.FIELD
  );
  return { fieldNodes, fragments };
};

describe('isFieldSelected', () => {
  it.each`
    description                | query                                                                                             | expected
    ${'selected directly'}     | ${'{ search { matches { id } facets { sector { key } } } }'}                                      | ${true}
    ${'not selected'}          | ${'{ search { matches { id } truncated } }'}                                                      | ${false}
    ${'in an inline fragment'} | ${'{ search { ... on Result { facets { sector { key } } } } }'}                                   | ${true}
    ${'in a fragment spread'}  | ${'{ search { ...ResultFields } } fragment ResultFields on Result { facets { region { key } } }'} | ${true}
    ${'only nested deeper'}    | ${'{ search { matches { facets } } }'}                                                            | ${false}
  `(
    'returns $expected when the field is $description',
    ({ query, expected }) => {
      expect(isFieldSelected(resolveInfoOf(query), 'facets')).toBe(expected);
    }
  );
});
