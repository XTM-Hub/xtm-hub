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
  query: string,
  variableValues: Record<string, unknown> = {}
): Pick<GraphQLResolveInfo, 'fieldNodes' | 'fragments' | 'variableValues'> => {
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
  return { fieldNodes, fragments, variableValues };
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

  it.each`
    description                                    | query                                                                                                               | variables         | expected
    ${'facets included'}                           | ${'{ search { facets @include(if: true) { sector { value } } } }'}                                                  | ${{}}             | ${['sector']}
    ${'facets excluded'}                           | ${'{ search { facets @include(if: false) { sector { value } } } }'}                                                 | ${{}}             | ${[]}
    ${'facets skipped'}                            | ${'{ search { facets @skip(if: true) { sector { value } } } }'}                                                     | ${{}}             | ${[]}
    ${'facets skipped by a variable'}              | ${'query ($skip: Boolean!) { search { facets @skip(if: $skip) { sector { value } } } }'}                            | ${{ skip: true }} | ${[]}
    ${'one facet excluded by a variable'}          | ${'query ($all: Boolean!) { search { facets { sector { value } region @include(if: $all) { value } } } }'}          | ${{ all: false }} | ${['sector']}
    ${'a fragment spread skipped'}                 | ${'{ search { ...ResultFields @skip(if: true) } } fragment ResultFields on Result { facets { region { value } } }'} | ${{}}             | ${[]}
    ${'an inline fragment included by a variable'} | ${'query ($all: Boolean!) { search { ... @include(if: $all) { facets { region { value } } } } }'}                   | ${{ all: true }}  | ${['region']}
  `('returns $expected with $description', ({ query, variables, expected }) => {
    expect(
      selectedSubFieldNames(resolveInfoOf(query, variables), 'facets')
    ).toEqual(expected);
  });
});
