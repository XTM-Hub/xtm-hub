import type { ApolloServer } from '@apollo/server';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, expect, it, type MockInstance } from 'vitest';
import { requestContext } from '../../src/context/request.context';
import type { UserId } from '../../src/model/kanel/public/User';
import type { UserLoadUserBy } from '../../src/model/user';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../src/modules/security-management/token/platform-token.util';
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
// Members of the Filigran organization without any organization capability, told apart by their access to a service:
// the manager holds MANAGE_ACCESS and the member ACCESS on it, the stranger holds nothing
type ServiceRow = 'serviceManager' | 'serviceMember' | 'serviceStranger';
type SystemTokenRow = 'system' | 'invalidSystemToken';
type PlatformRow = 'platform' | 'invalidPlatformToken' | 'unknownPlatform';
export type AccessRow =
  SessionRow | OrganizationRow | ServiceRow | SystemTokenRow | PlatformRow;
export type AccessOutcome = 'allowed' | DenialCode;

export interface AccessMatrixFixture {
  variables: Record<string, unknown>;
  // What the operation answers to a row that is allowed
  expectedData: Record<string, unknown>;
  expectedDataByRow?: Partial<Record<AccessRow, Record<string, unknown>>>;
  platformCredentials?: { platformId: string; token: string };
  cleanup: () => Promise<void>;
}

export interface AccessMatrixOptions {
  operation: string;
  prepare: () => Promise<AccessMatrixFixture>;
  // Spies on the app or domain function behind the operation: not called when the row is refused,
  // e.g. () => vi.spyOn(solutionCategoryDomain, 'insertSolutionCategory')
  guarded: () => MockInstance;
  expected: Record<SessionRow, AccessOutcome> &
    Partial<
      Record<
        OrganizationRow | ServiceRow | SystemTokenRow | PlatformRow,
        AccessOutcome
      >
    >;
}

const ROWS: AccessRow[] = [
  'anonymous',
  'user',
  'admin',
  'memberWithoutCapability',
  'otherOrganization',
  'nonMember',
  'serviceManager',
  'serviceMember',
  'serviceStranger',
  'system',
  'invalidSystemToken',
  'platform',
  'invalidPlatformToken',
  'unknownPlatform',
];

const ERROR_FAMILY: Record<DenialCode, ErrorType> = {
  [UnauthenticatedErrorCode.Unauthenticated]: ErrorType.Unauthenticated,
  [ForbiddenErrorCode.ForbiddenAccess]: ErrorType.ForbiddenAccess,
  [ForbiddenErrorCode.MissingCapabilityOnOrganization]:
    ErrorType.ForbiddenAccess,
  [ForbiddenErrorCode.MissingCapabilityOnService]: ErrorType.ForbiddenAccess,
  [NotFoundErrorCode.NotFound]: ErrorType.NotFound,
};

const withSessionUser = (
  context: Context,
  overrides: Partial<UserLoadUserBy>
): Context => ({ ...context, user: { ...context.user, ...overrides } });

const MEMBER_WITHOUT_CAPABILITY = withSessionUser(contextSimpleUserFiligran2, {
  organization_capabilities: (
    contextSimpleUserFiligran2.user.organization_capabilities ?? []
  ).map((membership) =>
    membership.organization.id === TEST_ORGANIZATIONS.FILIGRAN.ID
      ? { ...membership, capabilities: [] }
      : membership
  ),
});

// The service rows are told apart by the user they are, so that a fixture can grant each its own access
const SERVICE_ROW_USER_IDS: Record<ServiceRow, UserId> = {
  serviceManager: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
  serviceMember: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
  serviceStranger: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
};

// The manager reuses the id of the BYPASS user: no portal capability, so that it is never a BYPASS caller
const asServiceUser = (row: ServiceRow): Context =>
  withSessionUser(MEMBER_WITHOUT_CAPABILITY, {
    id: SERVICE_ROW_USER_IDS[row],
    capabilities: [],
  });

const SESSION_CONTEXTS: Record<
  SessionRow | OrganizationRow | ServiceRow | SystemTokenRow,
  Context
> = {
  // The API leaves the user undefined for a visitor without session, which Context does not allow
  anonymous: {
    ...contextSimpleUserFiligran2,
    user: undefined,
  } as unknown as Context,
  user: contextSimpleUserFiligran2,
  admin: contextBypassUser,
  memberWithoutCapability: MEMBER_WITHOUT_CAPABILITY,
  otherOrganization: contextSimpleUserSecondOrga,
  nonMember: withSessionUser(contextSimpleUserFiligran2, {
    selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
  }),
  system: contextSystemToken,
  serviceManager: asServiceUser('serviceManager'),
  serviceMember: asServiceUser('serviceMember'),
  serviceStranger: asServiceUser('serviceStranger'),
  invalidSystemToken: contextInvalidSystemToken,
};

const platformContext = (platformId: string, token: string): Context =>
  ({
    req: {
      headers: {
        [PLATFORM_ID_HEADER]: platformId,
        [PLATFORM_TOKEN_HEADER]: token,
      },
    },
  }) as unknown as Context;

const platformContextOf = (
  row: PlatformRow,
  credentials: AccessMatrixFixture['platformCredentials']
): Context => {
  if (!credentials) {
    throw new Error(`The fixture needs platformCredentials for the ${row} row`);
  }
  switch (row) {
    case 'platform':
      return platformContext(credentials.platformId, credentials.token);
    case 'invalidPlatformToken':
      return platformContext(credentials.platformId, uuidv4());
    case 'unknownPlatform':
      return platformContext(uuidv4(), credentials.token);
  }
};

const contextOf = (row: AccessRow, fixture: AccessMatrixFixture): Context => {
  switch (row) {
    case 'platform':
    case 'invalidPlatformToken':
    case 'unknownPlatform':
      return platformContextOf(row, fixture.platformCredentials);
    default:
      return SESSION_CONTEXTS[row];
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
    contextValue: Context
  ) => {
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
  serviceRowUserIds: SERVICE_ROW_USER_IDS,
  // Call inside a describe: runs an operation through the real schema as one of the session rows of the matrix
  useGraphqlAs: () => {
    const execute = useGraphqlServer();
    return (
      row: SessionRow | OrganizationRow | ServiceRow,
      operation: string,
      variables: Record<string, unknown>
    ) => execute(operation, variables, SESSION_CONTEXTS[row]);
  },

  // Call inside a describe named after the operation. Runs it as an anonymous visitor,
  // a member with no portal capability and a platform admin, plus the organization, system-token and platform rows that expected lists
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
          const { errors } = await execute(
            operation,
            fixture.variables,
            contextOf(row, fixture)
          );

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
            contextOf(row, fixture)
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
