import { ApolloServer } from '@apollo/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Context } from './apollo-plugins/log';
import { createApolloServer } from './apollo-server';
import createSchema from './graphql-schema';

const DID_YOU_MEAN = 'Did you mean';
const AUTO_REGISTER_PLATFORM_INPUT = `{
  platform: { id: "p1", url: "https://platform.test", title: "Platform", contract: EE }
}`;
const VALID_VARIABLES_INPUT = {
  platform: {
    id: 'p1',
    url: 'https://platform.test',
    title: 'Platform',
    contract: 'EE',
  },
};

const MUTATION_WITH_INPUT_VARIABLE = `
  mutation ($input: AutoRegisterPlatformInput) {
    autoRegisterPlatform(input: $input)
  }
`;

const SCHEMA_PROBES = [
  {
    name: 'unknown field',
    query: 'mutation { autoRegisterPlatfrm }',
    variables: undefined,
  },
  {
    name: 'unknown argument',
    query: `mutation { autoRegisterPlatform(inptu: ${AUTO_REGISTER_PLATFORM_INPUT}) }`,
    variables: undefined,
  },
  {
    name: 'unknown enum value in the document',
    query: `mutation { autoRegisterPlatform(input: {
      platform: { id: "p1", url: "https://platform.test", title: "Platform", contract: EEE }
    }) }`,
    variables: undefined,
  },
  {
    name: 'unknown enum value in the variables',
    query: MUTATION_WITH_INPUT_VARIABLE,
    variables: {
      input: {
        platform: { ...VALID_VARIABLES_INPUT.platform, contract: 'EEE' },
      },
    },
  },
  {
    name: 'unknown field in a variable input object',
    query: MUTATION_WITH_INPUT_VARIABLE,
    variables: { input: { ...VALID_VARIABLES_INPUT, existing_users_cnt: 1 } },
  },
];

const INTROSPECTION_QUERY = '{ __schema { queryType { name } } }';

const execute = async (
  server: ApolloServer<Context>,
  query: string,
  variables?: Record<string, unknown>
) => {
  const response = await server.executeOperation({ query, variables });
  if (response.body.kind !== 'single') {
    throw new Error('Expected a single GraphQL response');
  }
  return response.body.singleResult;
};

describe('createApolloServer', () => {
  const schema = createSchema();

  describe('when the schema details are hidden', () => {
    const server = createApolloServer({ schema, exposeSchemaDetails: false });

    beforeAll(async () => {
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it.each(SCHEMA_PROBES)(
      'should not suggest schema names when the request has an $name',
      async ({ query, variables }) => {
        // Given a probe that makes graphql-js suggest a schema name

        // When
        const result = await execute(server, query, variables);

        // Then
        expect(result.errors?.length).toBeGreaterThan(0);
        expect(JSON.stringify(result)).not.toContain(DID_YOU_MEAN);
      }
    );

    it('should keep the rest of the error message when the hint is removed', async () => {
      // Given
      const query = 'mutation { autoRegisterPlatfrm }';

      // When
      const result = await execute(server, query);

      // Then
      expect(result.errors?.[0]).toMatchObject({
        message: 'Cannot query field "autoRegisterPlatfrm" on type "Mutation".',
      });
    });

    it('should refuse an introspection query', async () => {
      // Given / When
      const result = await execute(server, INTROSPECTION_QUERY);

      // Then
      expect(result.data).toBeUndefined();
      expect(result.errors?.[0].message).toContain('introspection');
    });

    it('should scrub a message echoing a large literal in linear time', async () => {
      // Given a literal made of repeated hint openers, which makes a backtracking regex quadratic
      const hugeLiteral = 'Did you mean '.repeat(25_000);
      const query = `mutation { autoRegisterPlatform(input: {
        platform: { id: "p1", url: "https://platform.test", title: "Platform", contract: EE },
        existing_users_count: "${hugeLiteral}"
      }) { success } }`;

      // When
      const start = performance.now();
      const result = await execute(server, query);
      const elapsedMs = performance.now() - start;

      // Then
      expect(result.errors?.[0].message).toContain(
        'Int cannot represent non-integer value'
      );
      expect(elapsedMs).toBeLessThan(1000);
    });
  });

  describe('when the schema details are exposed', () => {
    const server = createApolloServer({ schema, exposeSchemaDetails: true });

    beforeAll(async () => {
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it.each(SCHEMA_PROBES)(
      'should suggest schema names when the request has an $name',
      async ({ query, variables }) => {
        // Given a probe that makes graphql-js suggest a schema name

        // When
        const result = await execute(server, query, variables);

        // Then
        expect(JSON.stringify(result)).toContain(DID_YOU_MEAN);
      }
    );

    it('should answer an introspection query', async () => {
      // Given / When
      const result = await execute(server, INTROSPECTION_QUERY);

      // Then
      expect(result.errors).toBeUndefined();
      expect(result.data).toMatchObject({
        __schema: { queryType: { name: 'Query' } },
      });
    });

    it('should return a stack trace when a request fails', async () => {
      // Given / When
      const result = await execute(server, 'mutation { autoRegisterPlatfrm }');

      // Then
      expect(result.errors?.[0].extensions).toHaveProperty('stacktrace');
    });
  });
});
