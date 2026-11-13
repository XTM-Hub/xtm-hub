import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextSimpleUserFiligran2,
} from '../../../tests/tests.const';
import { PortalCapability } from '../../__generated__/resolvers-types';
import { UserLoadUserBy } from '../../model/user';
import { UserDomain } from '../../modules/organization-management/user/user-domain/user.domain';
import { CAPABILITY_BYPASS } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { ErrorType } from '../../utils/error/error.type';
import { deny, Guard, GuardResult } from './guard.types';
import { Guarded, Public } from './guarded.decorator';
import { portalCapabilityGuard } from './guards/portal.guard';
import { buildPrincipal, GuardedContext } from './principal';

const RESOLVED_VALUE = 'resolved';
const GUARD_FAILURE_LOG = 'Access guard threw, access denied';

type TestResolver = (
  parent: object,
  args: { id: string },
  context: GuardedContext,
  info: unknown
) => string;

const resolve = vi.fn<TestResolver>(() => RESOLVED_VALUE);

const throwingGuard: Guard = () => {
  throw new Error('guard failure');
};

const denyingGuard: Guard = () => deny(ErrorType.ForbiddenAccess);

let malformedResult: unknown;
const malformedGuard: Guard = () => malformedResult as GuardResult;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class TestResolvers {
  @Guarded(portalCapabilityGuard([PortalCapability.Bypass]))
  static readonly adminOnly: TestResolver = (...args) => resolve(...args);

  @Guarded(throwingGuard)
  static readonly guardThrows: TestResolver = (...args) => resolve(...args);

  @Guarded(denyingGuard)
  static readonly guardDenies: TestResolver = (...args) => resolve(...args);

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

afterEach(() => {
  vi.restoreAllMocks();
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
    });

    // When
    const principal = await buildPrincipal({ user });

    // Then
    expect(principal).toEqual({
      kind: 'user',
      actorId: user.id,
      isPlatformAdmin: false,
      portalCapabilities: new Set([PortalCapability.ManageDeployment]),
      selectedOrganizationId: user.selected_organization_id,
    });
  });

  it('should flag a BYPASS user as platform admin', async () => {
    // Given
    const user = buildUser({ capabilities: [CAPABILITY_BYPASS] });

    // When
    const principal = await buildPrincipal({ user });

    // Then
    expect(principal).toMatchObject({
      kind: 'user',
      isPlatformAdmin: true,
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
    expect(principal).toMatchObject({ kind: 'user', isPlatformAdmin: true });
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
    {
      label: 'an anonymous visitor',
      context: { user: undefined },
      code: ErrorType.Unauthenticated,
    },
    {
      label: 'a disabled admin',
      context: {
        user: buildUser({ disabled: true, capabilities: [CAPABILITY_BYPASS] }),
      },
      code: ErrorType.Unauthenticated,
    },
    {
      label: 'a user without the capability',
      context: { user: buildUser({ capabilities: [] }) },
      code: ErrorType.ForbiddenAccess,
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
      message: ErrorType.ForbiddenAccess,
      extensions: { code: ErrorType.ForbiddenAccess },
    });
    const guardFailureLogs = logError.mock.calls.filter(
      ([message]) => message === GUARD_FAILURE_LOG
    );
    expect(guardFailureLogs).toHaveLength(1);
    expect(resolve).not.toHaveBeenCalled();
  });

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
        message: ErrorType.ForbiddenAccess,
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
