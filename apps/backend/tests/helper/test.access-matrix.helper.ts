import type { ApolloServer } from '@apollo/server';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, expect, it, type MockInstance } from 'vitest';
import { ApiTokenScope } from '../../src/__generated__/resolvers-types';
import { requestContext } from '../../src/context/request.context';
import type { OrganizationId } from '../../src/model/kanel/public/Organization';
import type { UserId } from '../../src/model/kanel/public/User';
import type { UserLoadUserBy } from '../../src/model/user';
import { getApiTokenAuthentication } from '../../src/modules/api-token/api-token.auth';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../src/modules/security-management/token/platform-token.util';
import type { DenialCode } from '../../src/security/guarded/guard.types';
import type { Context } from '../../src/server/apollo-plugins/log';
import { buildRequestContext } from '../../src/server/request-context.middleware';
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
import {
  type ApiTokenRequest,
  TestApiTokenHelper,
} from './test.api-token.helper';

type SessionRow = 'anonymous' | 'user' | 'admin';
type OrganizationRow =
  'memberWithoutCapability' | 'otherOrganization' | 'nonMember';
// Members of the Filigran organization without any organization capability, told apart by their access to a service:
// the manager holds MANAGE_ACCESS and the member ACCESS on it, the stranger holds nothing
type ServiceRow = 'serviceManager' | 'serviceMember' | 'serviceStranger';
type SystemTokenRow = 'system' | 'invalidSystemToken';
type PlatformRow = 'platform' | 'invalidPlatformToken' | 'unknownPlatform';
// A request authenticated by a personal API token
type TokenRow =
  | 'tokenRead'
  | 'tokenReadWrite'
  | 'tokenAdmin'
  | 'tokenOtherOrganization'
  | 'tokenServiceManager'
  | 'tokenServiceMember';
export type AccessRow =
  | SessionRow
  | OrganizationRow
  | ServiceRow
  | SystemTokenRow
  | PlatformRow
  | TokenRow;
// The plugin of the token answers READ_ONLY_API_TOKEN before any guard: it is not a denial of a guard
export type AccessOutcome =
  'allowed' | DenialCode | ForbiddenErrorCode.ReadOnlyApiToken;

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
        OrganizationRow | ServiceRow | SystemTokenRow | PlatformRow | TokenRow,
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
  'tokenRead',
  'tokenReadWrite',
  'tokenAdmin',
  'tokenOtherOrganization',
  'tokenServiceManager',
  'tokenServiceMember',
];

const ERROR_FAMILY: Record<
  DenialCode | ForbiddenErrorCode.ReadOnlyApiToken,
  ErrorType
> = {
  [UnauthenticatedErrorCode.Unauthenticated]: ErrorType.Unauthenticated,
  [ForbiddenErrorCode.ForbiddenAccess]: ErrorType.ForbiddenAccess,
  [ForbiddenErrorCode.MissingCapabilityOnOrganization]:
    ErrorType.ForbiddenAccess,
  [ForbiddenErrorCode.MissingCapabilityOnService]: ErrorType.ForbiddenAccess,
  [ForbiddenErrorCode.NotAllowedWithApiToken]: ErrorType.ForbiddenAccess,
  [ForbiddenErrorCode.ReadOnlyApiToken]: ErrorType.ForbiddenAccess,
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

// ADMIN_ORGA administers SECOND ORGA, which a read_write token loses; SIMPLE2 belongs to Filigran
const TOKEN_ROWS: Record<
  TokenRow,
  {
    userId: UserId;
    organizationId: OrganizationId;
    scope: ApiTokenScope;
  }
> = {
  tokenRead: {
    userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
    organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    scope: ApiTokenScope.Read,
  },
  tokenReadWrite: {
    userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
    organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    scope: ApiTokenScope.ReadWrite,
  },
  tokenAdmin: {
    userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
    organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    scope: ApiTokenScope.Admin,
  },
  tokenOtherOrganization: {
    userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
    organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
    scope: ApiTokenScope.ReadWrite,
  },
  // The users of the service rows, as read_write tokens for Filigran: the access of the fixture is theirs
  tokenServiceManager: {
    userId: SERVICE_ROW_USER_IDS.serviceManager,
    organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
    scope: ApiTokenScope.ReadWrite,
  },
  tokenServiceMember: {
    userId: SERVICE_ROW_USER_IDS.serviceMember,
    organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
    scope: ApiTokenScope.ReadWrite,
  },
};

const isTokenRow = (row: AccessRow): row is TokenRow => row in TOKEN_ROWS;

type SessionContextRow = keyof typeof SESSION_CONTEXTS;
const isSessionContextRow = (row: AccessRow): row is SessionContextRow =>
  row in SESSION_CONTEXTS;

const sendTokenOf = (row: TokenRow): Promise<ApiTokenRequest> =>
  TestApiTokenHelper.apiToken.send(TOKEN_ROWS[row]);

// The call of an API client: the request the middleware authenticated is the one the operation runs with
const contextOfToken = ({ req }: ApiTokenRequest): Context => {
  const authentication = getApiTokenAuthentication(req);
  if (!authentication) {
    throw new Error('The token of the request was refused');
  }
  return { ...contextSimpleUserFiligran2, user: authentication.user, req };
};

const contextOf = (row: AccessRow, fixture: AccessMatrixFixture): Context => {
  switch (row) {
    case 'platform':
    case 'invalidPlatformToken':
    case 'unknownPlatform':
      return platformContextOf(row, fixture.platformCredentials);
    default:
      if (isSessionContextRow(row)) {
        return SESSION_CONTEXTS[row];
      }
      throw new Error(`No session context for the ${row} row`);
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
    // A call that sends a token runs with the request context of its request, which carries the reach of the token
    const { req } = contextValue;
    requestContext.set(
      req && getApiTokenAuthentication(req)
        ? buildRequestContext(req)
        : { user: contextValue.user ?? undefined }
    );
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
  // Call inside a describe: runs an operation as a call that sends the token of `TestApiTokenHelper.apiToken.send`
  useGraphqlAsToken: () => {
    const execute = useGraphqlServer();
    return (
      tokenRequest: ApiTokenRequest,
      operation: string,
      variables: Record<string, unknown>
    ) => execute(operation, variables, contextOfToken(tokenRequest));
  },

  // Call inside a describe: runs an operation as a platform that sends these headers, without session
  useGraphqlAsPlatform: () => {
    const execute = useGraphqlServer();
    return (
      headers: Record<string, string>,
      operation: string,
      variables: Record<string, unknown> = {}
    ) =>
      execute(operation, variables, {
        req: { headers },
      } as unknown as Context);
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

    // The context of a row, and what to clean once it ran: a token row creates its token
    const contextAndCleanup = async (
      row: AccessRow,
      fixture: AccessMatrixFixture
    ): Promise<{ context: Context; cleanup: () => Promise<void> }> => {
      if (isTokenRow(row)) {
        const tokenRequest = await sendTokenOf(row);
        return {
          context: contextOfToken(tokenRequest),
          cleanup: tokenRequest.cleanup,
        };
      }
      return {
        context: contextOf(row, fixture),
        cleanup: () => Promise.resolve(),
      };
    };

    it.each(refusedRows)(
      'should refuse with $code and not call the guarded function when the caller is $row',
      async ({ row, code, family }) => {
        // Given
        const fixture = await prepare();
        const spy = guarded();
        const { context, cleanup } = await contextAndCleanup(row, fixture);

        try {
          // When
          const { errors } = await execute(
            operation,
            fixture.variables,
            context
          );

          // Then
          expect(errors).toMatchObject([
            { message: code, extensions: { code: family } },
          ]);
          expect(spy).not.toHaveBeenCalled();
        } finally {
          await cleanup();
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
        const { context, cleanup } = await contextAndCleanup(row, fixture);

        try {
          // When
          const { data, errors } = await execute(
            operation,
            fixture.variables,
            context
          );

          // Then
          expect(errors).toBeUndefined();
          expect(data).toMatchObject(
            fixture.expectedDataByRow?.[row] ?? fixture.expectedData
          );
          expect(spy).toHaveBeenCalledTimes(1);
        } finally {
          await cleanup();
          await fixture.cleanup();
        }
      }
    );
  },
};
