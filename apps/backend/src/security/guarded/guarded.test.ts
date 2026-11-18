import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextSimpleUserFiligran2,
  TEST_ORGANIZATIONS,
  TEST_SYSTEM_TOKEN,
} from '../../../tests/tests.const';
import {
  OrganizationCapability,
  PortalCapability,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { UserLoadUserBy } from '../../model/user';
import { UserDomain } from '../../modules/organization-management/user/user-domain/user.domain';
import { CAPABILITY_BYPASS, SYSTEM_USER_UUID } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { ErrorType } from '../../utils/error/error.type';
import { SYSTEM_TOKEN_HEADER } from '../system-token';
import { allow, DenialCode, deny, Guard, GuardResult } from './guard.types';
import { Guarded, Public } from './guarded.decorator';
import { callerGuard } from './guards/caller.guard';
import { portalCapabilityGuard } from './guards/portal.guard';
import {
  buildPrincipal,
  buildSystemPrincipal,
  GuardedContext,
  Principal,
} from './principal';

const RESOLVED_VALUE = 'resolved';
const GUARD_FAILURE_LOG = 'Access guard threw, access denied';

type TestResolver = (
  parent: object,
  args: { id: string },
  context: GuardedContext,
  info: unknown
) => string;

const resolve = vi.fn<TestResolver>(() => RESOLVED_VALUE);

const throwingGuard: Guard = {
  check: () => {
    throw new Error('guard failure');
  },
  principalFrom: buildPrincipal,
};

const denyingGuard: Guard = {
  check: () => deny(ForbiddenErrorCode.ForbiddenAccess),
  principalFrom: buildPrincipal,
};

let denialCode: DenialCode;
const codeGuard: Guard = {
  check: () => deny(denialCode),
  principalFrom: buildPrincipal,
};

let malformedResult: unknown;
const malformedGuard: Guard = {
  check: () => malformedResult as GuardResult,
  principalFrom: buildPrincipal,
};

const OWN_PRINCIPAL: Principal = {
  kind: 'system',
  actorId: SYSTEM_USER_UUID,
  portalCapabilities: new Set([PortalCapability.ManageDeployment]),
};
const buildOwnPrincipal = vi.fn((_context: GuardedContext) => OWN_PRINCIPAL);
const receivedPrincipals: Principal[] = [];
const ownPrincipalGuard: Guard = {
  check: (principal) => {
    receivedPrincipals.push(principal);
    return allow();
  },
  principalFrom: buildOwnPrincipal,
};

const PRINCIPAL_FAILURE = new Error('principal unavailable');
const failingPrincipalGuard: Guard = {
  check: () => allow(),
  principalFrom: () => Promise.reject(PRINCIPAL_FAILURE),
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class TestResolvers {
  @Guarded(portalCapabilityGuard([PortalCapability.Bypass]))
  static readonly adminOnly: TestResolver = (...args) => resolve(...args);

  @Guarded(callerGuard('system', [PortalCapability.GenerateManifest]))
  static readonly systemOnly: TestResolver = (...args) => resolve(...args);

  @Guarded(failingPrincipalGuard)
  static readonly failingPrincipal: TestResolver = (...args) =>
    resolve(...args);

  @Guarded(ownPrincipalGuard)
  static readonly ownPrincipal: TestResolver = (...args) => resolve(...args);

  @Guarded(throwingGuard)
  static readonly guardThrows: TestResolver = (...args) => resolve(...args);

  @Guarded(denyingGuard)
  static readonly guardDenies: TestResolver = (...args) => resolve(...args);

  @Guarded(codeGuard)
  static readonly guardDeniesWithCode: TestResolver = (...args) =>
    resolve(...args);

  @Guarded(malformedGuard)
  static readonly guardMalformed: TestResolver = (...args) => resolve(...args);

  @Public()
  static readonly open: TestResolver = (...args) => resolve(...args);
}

const ARGS = { id: 'category-id' };
const PARENT = {};
const INFO = {};

const buildUser = (
  overrides: Partial<UserLoadUserBy> = {}
): UserLoadUserBy => ({
  ...structuredClone(contextSimpleUserFiligran2.user),
  ...overrides,
});

const INVALID_TOKEN_LOG = 'Invalid system token attempt';

const withSystemToken = (
  token: string,
  user?: UserLoadUserBy
): GuardedContext => ({
  user,
  req: { headers: { [SYSTEM_TOKEN_HEADER]: token } },
});

afterEach(() => {
  vi.restoreAllMocks();
  buildOwnPrincipal.mockClear();
  receivedPrincipals.length = 0;
});

describe('buildPrincipal', () => {
  it.each([
    { label: 'no user', user: undefined },
    { label: 'a null user', user: null },
    { label: 'a disabled user', user: buildUser({ disabled: true }) },
  ])(
    'should build an anonymous principal when the context has $label',
    async ({ user }) => {
      // Given
      const context: GuardedContext = { user };

      // When
      const principal = await buildPrincipal(context);

      // Then
      expect(principal).toEqual({ kind: 'anonymous' });
    }
  );

  it('should build a user principal from the loaded capabilities', async () => {
    // Given
    const user = buildUser({
      capabilities: [
        { id: 'capability-id', name: PortalCapability.ManageDeployment },
      ] as UserLoadUserBy['capabilities'],
      organization_capabilities: [],
    });

    // When
    const principal = await buildPrincipal({ user });

    // Then
    expect(principal).toEqual({
      kind: 'user',
      actorId: user.id,
      isBypassUser: false,
      portalCapabilities: new Set([PortalCapability.ManageDeployment]),
      selectedOrganizationId: user.selected_organization_id,
      memberships: [],
    });
  });

  it('should take the memberships from the organization capabilities of the session', async () => {
    // Given
    const user = buildUser({
      capabilities: [],
      organization_capabilities: [
        {
          id: 'membership-id',
          organization: { id: TEST_ORGANIZATIONS.FILIGRAN.ID },
          capabilities: [OrganizationCapability.ManageAccess],
        },
      ] as UserLoadUserBy['organization_capabilities'],
    });

    // When
    const principal = await buildPrincipal({ user });

    // Then
    expect(principal).toMatchObject({
      kind: 'user',
      memberships: user.organization_capabilities,
    });
  });

  it('should build no membership when the session has no organization capabilities', async () => {
    // Given
    const user = buildUser({
      capabilities: [],
      organization_capabilities: undefined,
    });

    // When
    const principal = await buildPrincipal({ user });

    // Then
    expect(principal).toMatchObject({ kind: 'user', memberships: [] });
  });

  it('should set isBypassUser for a BYPASS user', async () => {
    // Given
    const user = buildUser({ capabilities: [CAPABILITY_BYPASS] });

    // When
    const principal = await buildPrincipal({ user });

    // Then
    expect(principal).toMatchObject({
      kind: 'user',
      isBypassUser: true,
      portalCapabilities: new Set([PortalCapability.Bypass]),
    });
  });

  it('should load the capabilities and write them back on the user when they are missing', async () => {
    // Given
    const user = buildUser({
      id: contextBypassUser.user.id,
      capabilities: undefined as unknown as UserLoadUserBy['capabilities'],
    });
    const getCapabilities = vi.spyOn(UserDomain, 'getCapabilities');

    // When
    const principal = await buildPrincipal({ user });

    // Then
    expect(getCapabilities).toHaveBeenCalledExactlyOnceWith(user.id);
    expect(user.capabilities).toMatchObject([CAPABILITY_BYPASS]);
    expect(principal).toMatchObject({ kind: 'user', isBypassUser: true });
  });

  it('should not load the capabilities again when they are already there', async () => {
    // Given
    const user = buildUser({ capabilities: [] });
    const getCapabilities = vi.spyOn(UserDomain, 'getCapabilities');

    // When
    await buildPrincipal({ user });

    // Then
    expect(getCapabilities).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'valid', token: TEST_SYSTEM_TOKEN },
    { label: 'invalid', token: 'invalid-token' },
  ])(
    'should judge on the session without checking the token when the request carries a $label system token',
    async ({ token }) => {
      // Given
      const logWarn = vi
        .spyOn(logApp, 'warn')
        .mockImplementation(() => undefined);
      const user = buildUser({ capabilities: [CAPABILITY_BYPASS] });
      const context = withSystemToken(token, user);

      // When
      const principal = await buildPrincipal(context);

      // Then
      expect(principal).toMatchObject({ kind: 'user', actorId: user.id });
      expect(logWarn).not.toHaveBeenCalled();
    }
  );
});

describe('buildSystemPrincipal', () => {
  it.each([
    { label: 'no session', user: undefined },
    {
      label: 'a BYPASS session',
      user: buildUser({ capabilities: [CAPABILITY_BYPASS] }),
    },
  ])(
    'should build a system caller holding exactly the requested scopes when the system token is valid and the request has $label',
    ({ user }) => {
      // Given
      const context = withSystemToken(TEST_SYSTEM_TOKEN, user);

      // When
      const principal = buildSystemPrincipal(context, [
        PortalCapability.GenerateManifest,
      ]);

      // Then
      expect(principal).toEqual({
        kind: 'system',
        actorId: SYSTEM_USER_UUID,
        portalCapabilities: new Set([PortalCapability.GenerateManifest]),
      });
    }
  );

  it.each([
    { label: 'invalid', headers: { [SYSTEM_TOKEN_HEADER]: 'invalid-token' } },
    { label: 'empty', headers: { [SYSTEM_TOKEN_HEADER]: '' } },
    { label: 'missing', headers: {} },
  ])(
    'should build an anonymous principal despite a BYPASS session and warn without the value when the system token is $label',
    ({ headers }) => {
      // Given
      const logWarn = vi
        .spyOn(logApp, 'warn')
        .mockImplementation(() => undefined);
      const context: GuardedContext = {
        user: buildUser({ capabilities: [CAPABILITY_BYPASS] }),
        req: { headers },
      };

      // When
      const principal = buildSystemPrincipal(context, [
        PortalCapability.GenerateManifest,
      ]);

      // Then
      expect(principal).toEqual({ kind: 'anonymous' });
      expect(logWarn).toHaveBeenCalledExactlyOnceWith(INVALID_TOKEN_LOG);
    }
  );
});

describe('@Guarded decorator', () => {
  it('should call the resolver with the arguments and the context unchanged when the guard allows', async () => {
    // Given
    const context: GuardedContext = {
      user: buildUser({ capabilities: [CAPABILITY_BYPASS] }),
    };
    const snapshot = structuredClone(context);

    // When
    const result = await TestResolvers.adminOnly(PARENT, ARGS, context, INFO);

    // Then
    expect(result).toBe(RESOLVED_VALUE);
    expect(resolve).toHaveBeenCalledExactlyOnceWith(
      PARENT,
      ARGS,
      context,
      INFO
    );
    expect(resolve.mock.calls[0]?.[2]).toBe(context);
    expect(context).toEqual(snapshot);
  });

  it.each([
    { label: 'no session', user: undefined },
    {
      label: 'a BYPASS session',
      user: buildUser({ capabilities: [CAPABILITY_BYPASS] }),
    },
  ])(
    'should call the resolver with a copied context holding a system user scoped to the declared capability when a valid system token comes with $label',
    async ({ user }) => {
      // Given
      const context = withSystemToken(TEST_SYSTEM_TOKEN, user);
      const snapshot = structuredClone(context);
      const systemUser = expect.objectContaining({
        id: SYSTEM_USER_UUID,
        capabilities: [
          expect.objectContaining({ name: PortalCapability.GenerateManifest }),
        ],
      });

      // When
      await TestResolvers.systemOnly(PARENT, ARGS, context, INFO);

      // Then
      expect(resolve).toHaveBeenCalledExactlyOnceWith(
        PARENT,
        ARGS,
        { ...context, user: systemUser },
        INFO
      );
      expect(requestContext.update).toHaveBeenCalledExactlyOnceWith({
        user: systemUser,
      });
      expect(context).toEqual(snapshot);
    }
  );

  it('should not call the resolver and let the error through when the principal cannot be built', async () => {
    // Given
    const context: GuardedContext = { user: undefined };

    // When
    const call = TestResolvers.failingPrincipal(PARENT, ARGS, context, INFO);

    // Then
    await expect(call).rejects.toBe(PRINCIPAL_FAILURE);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('should judge a guard on the principal built by its own principalFrom', async () => {
    // Given
    const context: GuardedContext = { user: undefined };

    // When
    await TestResolvers.ownPrincipal(PARENT, ARGS, context, INFO);

    // Then
    expect(buildOwnPrincipal).toHaveBeenCalledExactlyOnceWith(context);
    expect(receivedPrincipals).toEqual([OWN_PRINCIPAL]);
  });

  it('should refuse with UNAUTHENTICATED and not call the resolver when a BYPASS session without token calls a system-only resolver', async () => {
    // Given
    const context = { user: buildUser({ capabilities: [CAPABILITY_BYPASS] }) };

    // When
    const call = TestResolvers.systemOnly(PARENT, ARGS, context, INFO);

    // Then
    await expect(call).rejects.toMatchObject({
      message: UnauthenticatedErrorCode.Unauthenticated,
      extensions: { code: UnauthenticatedErrorCode.Unauthenticated },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'an anonymous visitor',
      context: { user: undefined },
      code: UnauthenticatedErrorCode.Unauthenticated,
    },
    {
      label: 'a disabled admin',
      context: {
        user: buildUser({ disabled: true, capabilities: [CAPABILITY_BYPASS] }),
      },
      code: UnauthenticatedErrorCode.Unauthenticated,
    },
    {
      label: 'a user without the capability',
      context: { user: buildUser({ capabilities: [] }) },
      code: ForbiddenErrorCode.ForbiddenAccess,
    },
    {
      label: 'a machine with a valid system token and no session',
      context: withSystemToken(TEST_SYSTEM_TOKEN),
      code: UnauthenticatedErrorCode.Unauthenticated,
    },
  ])(
    'should refuse $label with $code and not call the resolver',
    async ({ context, code }) => {
      // Given a resolver guarded by the BYPASS capability

      // When
      const call = TestResolvers.adminOnly(PARENT, ARGS, context, INFO);

      // Then
      await expect(call).rejects.toMatchObject({
        message: code,
        extensions: { code },
      });
      expect(resolve).not.toHaveBeenCalled();
    }
  );

  it('should call the resolver with the context unchanged when a BYPASS session sends a system token to a capability-guarded resolver', async () => {
    // Given
    const context = withSystemToken(
      TEST_SYSTEM_TOKEN,
      buildUser({ capabilities: [CAPABILITY_BYPASS] })
    );

    // When
    await TestResolvers.adminOnly(PARENT, ARGS, context, INFO);

    // Then
    expect(resolve).toHaveBeenCalledExactlyOnceWith(
      PARENT,
      ARGS,
      context,
      INFO
    );
  });

  it('should load the capabilities of a session user lazily and write them back on the context user', async () => {
    // Given
    const user = buildUser({
      id: contextBypassUser.user.id,
      capabilities: undefined as unknown as UserLoadUserBy['capabilities'],
    });

    // When
    const result = await TestResolvers.adminOnly(PARENT, ARGS, { user }, INFO);

    // Then
    expect(result).toBe(RESOLVED_VALUE);
    expect(user.capabilities).toMatchObject([CAPABILITY_BYPASS]);
  });

  it('should deny with FORBIDDEN_ACCESS, log the failure once and not call the resolver when the guard throws', async () => {
    // Given
    const logError = vi
      .spyOn(logApp, 'error')
      .mockImplementation(() => undefined);
    const context = { user: buildUser() };

    // When
    const call = TestResolvers.guardThrows(PARENT, ARGS, context, INFO);

    // Then
    await expect(call).rejects.toMatchObject({
      message: ForbiddenErrorCode.ForbiddenAccess,
      extensions: { code: ErrorType.ForbiddenAccess },
    });
    const guardFailureLogs = logError.mock.calls.filter(
      ([message]) => message === GUARD_FAILURE_LOG
    );
    expect(guardFailureLogs).toHaveLength(1);
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    {
      code: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      family: ErrorType.ForbiddenAccess,
    },
    { code: NotFoundErrorCode.NotFound, family: ErrorType.NotFound },
  ])(
    'should refuse with $code as message and $family as extensions code and not call the resolver when the guard denies with $code',
    async ({ code, family }) => {
      // Given
      denialCode = code;
      const context = { user: buildUser() };

      // When
      const call = TestResolvers.guardDeniesWithCode(
        PARENT,
        ARGS,
        context,
        INFO
      );

      // Then
      await expect(call).rejects.toMatchObject({
        message: code,
        extensions: { code: family },
      });
      expect(resolve).not.toHaveBeenCalled();
    }
  );

  it('should not log a guard failure when the guard denies on its own', async () => {
    // Given
    const logError = vi
      .spyOn(logApp, 'error')
      .mockImplementation(() => undefined);

    // When
    const call = TestResolvers.guardDenies(
      PARENT,
      ARGS,
      { user: buildUser() },
      INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      extensions: { code: ErrorType.ForbiddenAccess },
    });
    expect(
      logError.mock.calls.filter(([message]) => message === GUARD_FAILURE_LOG)
    ).toHaveLength(0);
  });

  it('should refuse the call and not call the resolver when the capabilities cannot be loaded', async () => {
    // Given
    const failure = new Error('database unavailable');
    vi.spyOn(UserDomain, 'getCapabilities').mockRejectedValue(failure);
    const user = buildUser({
      capabilities: undefined as unknown as UserLoadUserBy['capabilities'],
    });

    // When
    const call = TestResolvers.adminOnly(PARENT, ARGS, { user }, INFO);

    // Then
    await expect(call).rejects.toBe(failure);
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'nothing', result: undefined },
    { label: 'an empty object', result: {} },
    { label: 'a truthy allowed that is not true', result: { allowed: 'yes' } },
    { label: 'a denial without a code', result: { allowed: false } },
    {
      label: 'a denial with an unknown code',
      result: { allowed: false, code: 'SOMETHING_ELSE' },
    },
  ])(
    'should refuse with FORBIDDEN_ACCESS and not call the resolver when the guard returns $label',
    async ({ result }) => {
      // Given
      malformedResult = result;
      const context = { user: buildUser() };

      // When
      const call = TestResolvers.guardMalformed(PARENT, ARGS, context, INFO);

      // Then
      await expect(call).rejects.toMatchObject({
        message: ForbiddenErrorCode.ForbiddenAccess,
        extensions: { code: ErrorType.ForbiddenAccess },
      });
      expect(resolve).not.toHaveBeenCalled();
    }
  );

  it('should let the error of an allowed resolver through unchanged', async () => {
    // Given
    const failure = new Error('resolver failure');
    resolve.mockRejectedValueOnce(failure);
    const context = { user: buildUser({ capabilities: [CAPABILITY_BYPASS] }) };

    // When
    const call = TestResolvers.adminOnly(PARENT, ARGS, context, INFO);

    // Then
    await expect(call).rejects.toBe(failure);
  });
});

describe('@Public decorator', () => {
  it('should call the resolver without building a principal or loading capabilities', async () => {
    // Given
    const user = buildUser({
      capabilities: undefined as unknown as UserLoadUserBy['capabilities'],
    });
    const getCapabilities = vi.spyOn(UserDomain, 'getCapabilities');

    // When
    const result = await TestResolvers.open(PARENT, ARGS, { user }, INFO);

    // Then
    expect(result).toBe(RESOLVED_VALUE);
    expect(getCapabilities).not.toHaveBeenCalled();
    expect(user.capabilities).toBeUndefined();
  });

  it('should call the resolver for an anonymous visitor', async () => {
    // Given
    const context: GuardedContext = { user: undefined };

    // When
    const result = await TestResolvers.open(PARENT, ARGS, context, INFO);

    // Then
    expect(result).toBe(RESOLVED_VALUE);
    expect(resolve).toHaveBeenCalledExactlyOnceWith(
      PARENT,
      ARGS,
      context,
      INFO
    );
  });
});
