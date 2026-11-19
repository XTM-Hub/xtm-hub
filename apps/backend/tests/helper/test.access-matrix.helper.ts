import type { ApolloServer } from '@apollo/server';
import { afterAll, beforeAll, expect, it, type MockInstance } from 'vitest';
import { requestContext } from '../../src/context/request.context';
import type { UserLoadUserBy } from '../../src/model/user';
import type { DenialCode } from '../../src/security/guarded/guard.types';
import type { Context } from '../../src/server/apollo-plugins/log';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../src/utils/error/error.code';
import { ErrorType } from '../../src/utils/error/error.type';
import {
  contextBypassUser,
  contextInvalidSystemToken,
  contextSimpleUserFiligran2,
  contextSimpleUserSecondOrga,
  contextSystemToken,
  TEST_ORGANIZATIONS,
} from '../tests.const';

type SessionRow = 'anonymous' | 'user' | 'admin';
type OrganizationRow =
  'memberWithoutCapability' | 'otherOrganization' | 'nonMember';
type SystemTokenRow = 'system' | 'invalidSystemToken';
export type AccessRow = SessionRow | OrganizationRow | SystemTokenRow;
export type AccessOutcome = 'allowed' | DenialCode;

export interface AccessMatrixFixture {
  variables: Record<string, unknown>;
  // What the operation answers to a row that is allowed
  expectedData: Record<string, unknown>;
  expectedDataByRow?: Partial<Record<AccessRow, Record<string, unknown>>>;
  cleanup: () => Promise<void>;
}

export interface AccessMatrixOptions {
  operation: string;
  prepare: () => Promise<AccessMatrixFixture>;
  // Spies on the app or domain function behind the operation: not called when the row is refused,
  // e.g. () => vi.spyOn(solutionCategoryDomain, 'insertSolutionCategory')
  guarded: () => MockInstance;
  expected: Record<SessionRow, AccessOutcome> &
    Partial<Record<OrganizationRow | SystemTokenRow, AccessOutcome>>;
}

const ROWS: AccessRow[] = [
  'anonymous',
  'user',
  'admin',
  'memberWithoutCapability',
  'otherOrganization',
  'nonMember',
  'system',
  'invalidSystemToken',
];

const ERROR_FAMILY: Record<DenialCode, ErrorType> = {
  [UnauthenticatedErrorCode.Unauthenticated]: ErrorType.Unauthenticated,
  [ForbiddenErrorCode.ForbiddenAccess]: ErrorType.ForbiddenAccess,
  [ForbiddenErrorCode.MissingCapabilityOnOrganization]:
    ErrorType.ForbiddenAccess,
  [NotFoundErrorCode.NotFound]: ErrorType.NotFound,
};

const withSessionUser = (
  context: Context,
  overrides: Partial<UserLoadUserBy>
): Context => ({ ...context, user: { ...context.user, ...overrides } });

const CONTEXTS: Record<AccessRow, Context> = {
  // The API leaves the user undefined for a visitor without session, which Context does not allow
  anonymous: {
    ...contextSimpleUserFiligran2,
    user: undefined,
  } as unknown as Context,
  user: contextSimpleUserFiligran2,
  admin: contextBypassUser,
  memberWithoutCapability: withSessionUser(contextSimpleUserFiligran2, {
    organization_capabilities: (
      contextSimpleUserFiligran2.user.organization_capabilities ?? []
    ).map((membership) =>
      membership.organization.id === TEST_ORGANIZATIONS.FILIGRAN.ID
        ? { ...membership, capabilities: [] }
        : membership
    ),
  }),
  otherOrganization: contextSimpleUserSecondOrga,
  nonMember: withSessionUser(contextSimpleUserFiligran2, {
    selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
  }),
  system: contextSystemToken,
  invalidSystemToken: contextInvalidSystemToken,
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
    const contextValue = CONTEXTS[row];
    const previousRequestContext = requestContext.get();
    // The restrictions below the guard read the caller from the request context
    requestContext.set({ user: contextValue.user ?? undefined });
    try {
      const response = await server.executeOperation(
        { query: operation, variables },
        { contextValue }
      );
      if (response.body.kind !== 'single') {
        throw new Error('Expected a single GraphQL response');
      }
      return response.body.singleResult;
    } finally {
      requestContext.set(previousRequestContext);
    }
  };
};

export const TestAccessMatrixHelper = {
  // Call inside a describe named after the operation. Runs it as an anonymous visitor,
  // a member with no portal capability and a platform admin, plus the organization and system-token rows that expected lists
  expectAccessMatrix: ({
    operation,
    prepare,
    guarded,
    expected,
  }: AccessMatrixOptions) => {
    const execute = useGraphqlServer();

    const refusedRows = ROWS.flatMap((row) => {
      const outcome = expected[row];
      return outcome === undefined || outcome === 'allowed'
        ? []
        : [{ row, code: outcome, family: ERROR_FAMILY[outcome] }];
    });
    const allowedRows = ROWS.filter((row) => expected[row] === 'allowed').map(
      (row) => ({ row })
    );

    it.each(refusedRows)(
      'should refuse with $code and not call the guarded function when the caller is $row',
      async ({ row, code, family }) => {
        // Given
        const fixture = await prepare();
        const spy = guarded();

        try {
          // When
          const { errors } = await execute(operation, fixture.variables, row);

          // Then
          expect(errors).toMatchObject([
            { message: code, extensions: { code: family } },
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
          expect(data).toMatchObject(
            fixture.expectedDataByRow?.[row] ?? fixture.expectedData
          );
          expect(spy).toHaveBeenCalledTimes(1);
        } finally {
          await fixture.cleanup();
        }
      }
    );
  },
};
