// The CommonJS build, like the graphql-sse validate that withQueryLimitRules wraps
import { buildSchema, parse, specifiedRules, validate } from 'graphql/index.js';
import { describe, expect, it } from 'vitest';
import {
  createQueryLimitsRule,
  QUERY_LIMIT_RULES,
  withQueryLimitRules,
} from './graphql-query-limits';

const schema = buildSchema(`
  type Node {
    id: ID!
    child: Node
  }
  type Query {
    node: Node
  }
`);

const LIMITS = { maxDepth: 3, maxAliases: 2 };

const validateWithLimits = (query: string) =>
  validate(schema, parse(query), [
    ...specifiedRules,
    createQueryLimitsRule(LIMITS),
  ]).map((error) => error.message);

describe('createQueryLimitsRule', () => {
  it.each`
    description                              | query
    ${'a query at the depth limit'}          | ${'{ node { child { id } } }'}
    ${'a query at the alias limit'}          | ${'{ a: node { id } b: node { id } }'}
    ${'introspection deeper than the limit'} | ${'{ __schema { types { fields { type { name } } } } }'}
    ${'__typename at the deepest level'}     | ${'{ node { child { __typename id } } }'}
  `('should accept $description', ({ query }: { query: string }) => {
    // When
    const errors = validateWithLimits(query);

    // Then
    expect(errors).toEqual([]);
  });

  it.each`
    description                                 | query                                                                                      | expected
    ${'a query deeper than the limit'}          | ${'{ node { child { child { id } } } }'}                                                   | ${'Query depth 4 exceeds the limit of 3'}
    ${'a depth hidden in a fragment'}           | ${'query { node { ...Deep } } fragment Deep on Node { child { child { id } } }'}           | ${'Query depth 4 exceeds the limit of 3'}
    ${'a depth hidden in an inline fragment'}   | ${'{ node { ... on Node { child { child { id } } } } }'}                                   | ${'Query depth 4 exceeds the limit of 3'}
    ${'more aliases than the limit'}            | ${'{ a: node { id } b: node { id } c: node { id } }'}                                      | ${'Query uses 3 aliases, more than the limit of 2'}
    ${'aliases multiplied by fragment spreads'} | ${'query { node { ...Twice child { ...Twice } } } fragment Twice on Node { a: id b: id }'} | ${'Query uses 4 aliases, more than the limit of 2'}
  `(
    'should refuse $description',
    ({ query, expected }: { query: string; expected: string }) => {
      // When
      const errors = validateWithLimits(query);

      // Then
      expect(errors).toEqual([expected]);
    }
  );

  it('should measure a fragment cycle without looping', () => {
    // Given
    const query =
      'query { node { ...A } } fragment A on Node { child { ...B } } fragment B on Node { child { ...A } }';

    // When
    const errors = validateWithLimits(query);

    // Then
    expect(errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Cannot spread')])
    );
  });
});

describe('withQueryLimitRules', () => {
  it('should add the query limits to the rules of the wrapped validate', () => {
    // Given
    const tooDeep = parse(
      `{ node ${'{ child '.repeat(11)}{ id }${' }'.repeat(11)} }`
    );
    let receivedRuleCount = 0;
    const wrapped = withQueryLimitRules((schemaArg, documentAST, rules) => {
      receivedRuleCount = rules?.length ?? 0;
      return validate(schemaArg, documentAST, rules);
    });

    // When
    const errors = wrapped(schema, tooDeep);

    // Then
    expect(receivedRuleCount).toBe(
      specifiedRules.length + QUERY_LIMIT_RULES.length
    );
    expect(errors.map((error) => error.message)).toEqual([
      'Query depth 13 exceeds the limit of 10',
    ]);
  });
});
