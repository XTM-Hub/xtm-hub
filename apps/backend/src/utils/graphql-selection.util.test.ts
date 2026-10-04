import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  Kind,
  OperationDefinitionNode,
  parse,
} from 'graphql';
import { describe, expect, it } from 'vitest';
import { selectedSubFieldNames } from './graphql-selection.util';

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

describe('selectedSubFieldNames', () => {
  it.each`
    description                       | query                                                                                                                                             | expected
    ${'selected directly'}            | ${'{ search { matches { id } facets { sector { value } region { value } } } }'}                                                                   | ${['sector', 'region']}
    ${'not selected'}                 | ${'{ search { matches { id } truncated } }'}                                                                                                      | ${[]}
    ${'in an inline fragment'}        | ${'{ search { ... on Result { facets { sector { value } } } } }'}                                                                                 | ${['sector']}
    ${'in a fragment spread'}         | ${'{ search { ...ResultFields } } fragment ResultFields on Result { facets { region { value } } }'}                                               | ${['region']}
    ${'in fragments, each name once'} | ${'{ search { facets { sector { value } } ...More } } fragment More on Result { facets { ... on Facet { sector { count } region { value } } } }'} | ${['sector', 'region']}
    ${'only nested deeper'}           | ${'{ search { matches { facets { sector { value } } } } }'}                                                                                       | ${[]}
  `(
    'returns $expected when the sub-fields are $description',
    ({ query, expected }) => {
      expect(selectedSubFieldNames(resolveInfoOf(query), 'facets')).toEqual(
        expected
      );
    }
  );
});
