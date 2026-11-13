import type { ApolloServer } from '@apollo/server';
import { afterAll, beforeAll, expect, it, type MockInstance } from 'vitest';
import type { DenialCode } from '../../src/security/guarded/guard.types';
import type { Context } from '../../src/server/apollo-plugins/log';
import { contextBypassUser, contextSimpleUserFiligran2 } from '../tests.const';

export type AccessRow = 'anonymous' | 'user' | 'admin';
export type AccessOutcome = 'allowed' | DenialCode;

export interface AccessMatrixFixture {
  variables: Record<string, unknown>;
  // What the operation answers to a row that is allowed
  expectedData: Record<string, unknown>;
  cleanup: () => Promise<void>;
}

export interface AccessMatrixOptions {
  operation: string;
  prepare: () => Promise<AccessMatrixFixture>;
  // Spies on the app or domain function behind the operation: not called when the row is refused,
  // e.g. () => vi.spyOn(solutionCategoryDomain, 'insertSolutionCategory')
  guarded: () => MockInstance;
  expected: Record<AccessRow, AccessOutcome>;
}

const ROWS: AccessRow[] = ['anonymous', 'user', 'admin'];

const contextOf = (row: AccessRow): Context => {
  switch (row) {
    case 'anonymous':
      // The API leaves the user undefined for a visitor without session, which Context does not allow
      return {
        ...contextSimpleUserFiligran2,
        user: undefined,
      } as unknown as Context;
    case 'user':
      return contextSimpleUserFiligran2;
    case 'admin':
      return contextBypassUser;
  }
};

// Starts the real schema with the real formatError, as the API does
const useGraphqlServer = () => {
  let server: ApolloServer<Context>;

  beforeAll(async () => {
    const [{ createApolloServer }, { default: createSchema }] =
      await Promise.all([
        import('../../src/server/apollo-server'),
        import('../../src/server/graphql-schema'),
      ]);
    server = createApolloServer({
      schema: createSchema(),
      exposeSchemaDetails: false,
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  return async (
    operation: string,
    variables: Record<string, unknown>,
    row: AccessRow
  ) => {
    const response = await server.executeOperation(
      { query: operation, variables },
      { contextValue: contextOf(row) }
    );
    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }
    return response.body.singleResult;
  };
};

export const TestAccessMatrixHelper = {
  // Call inside a describe named after the operation. Runs it as an anonymous visitor,
  // a user without the capability and a platform admin
  expectAccessMatrix: ({
    operation,
    prepare,
    guarded,
    expected,
  }: AccessMatrixOptions) => {
    const execute = useGraphqlServer();

    const refusedRows = ROWS.flatMap((row) => {
      const outcome = expected[row];
      return outcome === 'allowed' ? [] : [{ row, code: outcome }];
    });
    const allowedRows = ROWS.filter((row) => expected[row] === 'allowed').map(
      (row) => ({ row })
    );

    it.each(refusedRows)(
      'should refuse with $code and not call the guarded function when the caller is $row',
      async ({ row, code }) => {
        // Given
        const fixture = await prepare();
        const spy = guarded();

        try {
          // When
          const { errors } = await execute(operation, fixture.variables, row);

          // Then
          expect(errors).toMatchObject([
            { message: code, extensions: { code } },
          ]);
          expect(spy).not.toHaveBeenCalled();
        } finally {
          await fixture.cleanup();
        }
      }
    );

    it.each(allowedRows)(
      'should answer with the data and call the guarded function once when the caller is $row',
      async ({ row }) => {
        // Given
        const fixture = await prepare();
        const spy = guarded();

        try {
          // When
          const { data, errors } = await execute(
            operation,
            fixture.variables,
            row
          );

          // Then
          expect(errors).toBeUndefined();
          expect(data).toMatchObject(fixture.expectedData);
          expect(spy).toHaveBeenCalledTimes(1);
        } finally {
          await fixture.cleanup();
        }
      }
    );
  },
};
