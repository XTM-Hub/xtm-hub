import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ErrorCode, UnknownErrorCode } from '../utils/error/error.code';
import { ForbiddenAccess } from '../utils/error/error.util';
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
    autoRegisterPlatform(input: $input) { success }
  }
`;

const SCHEMA_PROBES = [
  {
    name: 'unknown field',
    query: 'mutation { autoRegisterPlatfrm }',
    variables: undefined,
    code: 'GRAPHQL_VALIDATION_FAILED',
  },
  {
    name: 'unknown argument',
    query: `mutation { autoRegisterPlatform(inptu: ${AUTO_REGISTER_PLATFORM_INPUT}) { success } }`,
    variables: undefined,
    code: 'GRAPHQL_VALIDATION_FAILED',
  },
  {
    name: 'unknown enum value in the document',
    query: `mutation { autoRegisterPlatform(input: {
      platform: { id: "p1", url: "https://platform.test", title: "Platform", contract: EEE }
    }) { success } }`,
    variables: undefined,
    code: 'GRAPHQL_VALIDATION_FAILED',
  },
  {
    name: 'unknown enum value in the variables',
    query: MUTATION_WITH_INPUT_VARIABLE,
    variables: {
      input: {
        platform: { ...VALID_VARIABLES_INPUT.platform, contract: 'EEE' },
      },
    },
    code: 'BAD_USER_INPUT',
  },
  {
    name: 'unknown field in a variable input object',
    query: MUTATION_WITH_INPUT_VARIABLE,
    variables: { input: { ...VALID_VARIABLES_INPUT, existing_users_cnt: 1 } },
    code: 'BAD_USER_INPUT',
  },
];

const INTROSPECTION_QUERY = '{ __schema { queryType { name } } }';

const DATABASE_ERROR_MESSAGE = 'invalid input syntax for type uuid: "x"';
const CUSTOM_APOLLO_ERROR_MESSAGE = 'Invalid platform token provided';

const FAILING_SCHEMA = makeExecutableSchema({
  typeDefs: `type Query {
    databaseError: Boolean
    errorCode: Boolean
    unknownErrorCode: Boolean
    customApolloError: Boolean
  }`,
  resolvers: {
    Query: {
      databaseError: () => {
        throw new Error(DATABASE_ERROR_MESSAGE);
      },
      errorCode: () => {
        throw new Error(ErrorCode.InvalidPlatformToken);
      },
      unknownErrorCode: () => {
        throw new Error(UnknownErrorCode.EditOrganizationError);
      },
      customApolloError: () => {
        throw ForbiddenAccess(CUSTOM_APOLLO_ERROR_MESSAGE);
      },
    },
  },
});

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
      async ({ query, variables, code }) => {
        // Given a probe that makes graphql-js suggest a schema name

        // When
        const result = await execute(server, query, variables);

        // Then
        expect(result.errors?.[0].extensions?.code).toBe(code);
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
      async ({ query, variables, code }) => {
        // Given a probe that makes graphql-js suggest a schema name

        // When
        const result = await execute(server, query, variables);

        // Then
        expect(result.errors?.[0].extensions?.code).toBe(code);
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

  describe('when a resolver fails', () => {
    const hiddenServer = createApolloServer({
      schema: FAILING_SCHEMA,
      exposeSchemaDetails: false,
    });
    const exposedServer = createApolloServer({
      schema: FAILING_SCHEMA,
      exposeSchemaDetails: true,
    });

    beforeAll(async () => {
      await Promise.all([hiddenServer.start(), exposedServer.start()]);
    });

    afterAll(async () => {
      await Promise.all([hiddenServer.stop(), exposedServer.stop()]);
    });

    it.each([
      { exposure: 'hidden', server: hiddenServer },
      { exposure: 'exposed', server: exposedServer },
    ])(
      'should hide an unexpected error from the client when the schema details are $exposure',
      async ({ server }) => {
        // Given / When
        const result = await execute(server, '{ databaseError }');

        // Then
        expect(result.errors).toEqual([
          {
            message: UnknownErrorCode.UnknownError,
            locations: [{ line: 1, column: 3 }],
            path: ['databaseError'],
            extensions: { code: UnknownErrorCode.UnknownError },
          },
        ]);
      }
    );

    it.each([
      {
        name: 'an error code',
        field: 'errorCode',
        message: ErrorCode.InvalidPlatformToken,
      },
      {
        name: 'an unknown error code',
        field: 'unknownErrorCode',
        message: UnknownErrorCode.EditOrganizationError,
      },
      {
        name: 'an apollo-errors error',
        field: 'customApolloError',
        message: CUSTOM_APOLLO_ERROR_MESSAGE,
      },
    ])(
      'should send its message to the client when a resolver throws $name',
      async ({ field, message }) => {
        // Given / When
        const result = await execute(hiddenServer, `{ ${field} }`);

        // Then
        expect(result.errors?.[0]).toMatchObject({ message });
      }
    );
  });
});
