import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextSimpleUserFiligran2,
  TEST_ORGANIZATIONS,
  TEST_SYSTEM_TOKEN,
} from '../../../tests/tests.const';
import {
  ApiTokenScope,
  DeploymentRequestHubStatus,
  OrganizationCapability,
  PlatformConfigurationStatus,
  PortalCapability,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import type DeploymentRequest from '../../model/kanel/public/DeploymentRequest';
import type Organization from '../../model/kanel/public/Organization';
import { UserLoadUserBy } from '../../model/user';
import { DeploymentRequestDomain } from '../../modules/deployment/deployment.domain';
import { OrganizationDomain } from '../../modules/organization-management/organization/organization.domain';
import { UserDomain } from '../../modules/organization-management/user/user-domain/user.domain';
import {
  FullPlatformConfiguration,
  PlatformConfigurationDomain,
} from '../../modules/registration/platform-configuration/platform-configuration.domain';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../modules/security-management/token/platform-token.util';
import {
  CAPABILITY_BYPASS,
  PLATFORM_USER_UUID,
  SYSTEM_USER_UUID,
} from '../../portal.const';
import { buildRequestContext } from '../../server/request-context.middleware';
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
import { platformCallerGuard, systemCallerGuard } from './guards/caller.guard';
import { portalCapabilityGuard } from './guards/portal.guard';
import {
  buildPlatformPrincipal,
  buildPrincipal,
  buildSystemPrincipal,
  GuardedContext,
  PlatformPrincipal,
  Principal,
  requirePlatformCaller,
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

const receivedArgs: unknown[] = [];
const argsGuard: Guard = {
  check: (_principal, args) => {
    receivedArgs.push(args);
    return allow();
  },
  principalFrom: buildPrincipal,
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

  @Guarded(systemCallerGuard([PortalCapability.GenerateManifest]))
  static readonly systemOnly: TestResolver = (...args) => resolve(...args);

  @Guarded(platformCallerGuard({ credential: 'registration' }))
  static readonly platformOnly: TestResolver = (...args) => resolve(...args);

  @Guarded(platformCallerGuard({ credential: 'deploymentRequest' }))
  static readonly deploymentRequestOnly: TestResolver = (...args) =>
    resolve(...args);

  @Guarded(failingPrincipalGuard)
  static readonly failingPrincipal: TestResolver = (...args) =>
    resolve(...args);

  @Guarded(argsGuard)
  static readonly argsRecorded: TestResolver = (...args) => resolve(...args);

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

const PLATFORM_ID = '3f0e6f7e-5c1a-4e7e-8a52-0d1b6f2a9c11';
const PLATFORM_TOKEN = '9a7d3c52-1b64-4f0a-b3a8-6e2d4c8f1a77';
const PLATFORM_ORGANIZATION = {
  id: 'platform-organization-id',
  name: 'Platform organization',
} as Organization;
const REGISTRATION = {
  platformConfiguration: {
    service_instance_id: 'service-instance-id',
    platform_id: PLATFORM_ID,
    token: PLATFORM_TOKEN,
    status: PlatformConfigurationStatus.Active,
  },
  serviceDefinition: { identifier: 'opencti_registration' },
  platformIdentifier: 'opencti',
} as unknown as FullPlatformConfiguration;
const DEPLOYMENT_REQUEST = {
  platform_id: PLATFORM_ID,
  platform_token: PLATFORM_TOKEN,
  organization_requester_id: PLATFORM_ORGANIZATION.id,
  hub_status: DeploymentRequestHubStatus.Pending,
} as unknown as DeploymentRequest;
const REJECTED_CREDENTIALS_LOG = 'Rejected platform credentials';

const platformHeaders = (
  platformId: string = PLATFORM_ID,
  token: string = PLATFORM_TOKEN
) => ({
  [PLATFORM_ID_HEADER]: platformId,
  [PLATFORM_TOKEN_HEADER]: token,
});

const withPlatformHeaders = (
  headers: Record<string, unknown>,
  user?: UserLoadUserBy
): GuardedContext => ({ user, req: { headers } });

const givenRegistration = (
  organization: Organization | null,
  status: PlatformConfigurationStatus = PlatformConfigurationStatus.Active
) => {
  vi.spyOn(
    PlatformConfigurationDomain,
    'loadResolvedConfigurationByPlatformAndToken'
  ).mockResolvedValue({
    ...REGISTRATION,
    platformConfiguration: { ...REGISTRATION.platformConfiguration, status },
  });
  return vi
    .spyOn(OrganizationDomain, 'loadOrganizationSubscribedToServiceInstance')
    .mockResolvedValue(organization);
};

const givenNoRegistration = () =>
  vi
    .spyOn(
      PlatformConfigurationDomain,
      'loadResolvedConfigurationByPlatformAndToken'
    )
    .mockResolvedValue(undefined);

const givenDeploymentRequest = (
  organization: Organization,
  hubStatus: DeploymentRequestHubStatus = DEPLOYMENT_REQUEST.hub_status
) => {
  vi.spyOn(
    DeploymentRequestDomain,
    'loadDeploymentRequestBy'
  ).mockResolvedValue({ ...DEPLOYMENT_REQUEST, hub_status: hubStatus });
  return vi
    .spyOn(OrganizationDomain, 'loadOrganizationBy')
    .mockResolvedValue(organization);
};

const givenNoDeploymentRequest = () =>
  vi
    .spyOn(DeploymentRequestDomain, 'loadDeploymentRequestBy')
    .mockResolvedValue(undefined);

afterEach(() => {
  vi.restoreAllMocks();
  buildOwnPrincipal.mockClear();
  receivedPrincipals.length = 0;
  receivedArgs.length = 0;
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

describe('buildPrincipal for an API token', () => {
  it.each(Object.values(ApiTokenScope))(
    'should hold the token and its scope when the request carries a valid %s token',
    async (scope) => {
      // Given
      const sent = await TestHelper.apiToken.send({
        userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        scope,
      });

      try {
        // When
        const principal = await buildPrincipal({
          user: buildRequestContext(sent.req).user,
          req: sent.req,
        });

        // Then
        expect(principal).toMatchObject({
          kind: 'user',
          actorId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          selectedOrganizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          apiToken: { id: sent.tokenId, scope },
        });
      } finally {
        await sent.cleanup();
      }
    }
  );

  it('should hold the token and the token user when the request carries a session cookie too', async () => {
    // Given
    const sent = await TestHelper.apiToken.send({
      userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
      organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      scope: ApiTokenScope.Read,
      sessionUser: buildUser({ capabilities: [CAPABILITY_BYPASS] }),
    });

    try {
      // When
      const principal = await buildPrincipal({
        user: buildRequestContext(sent.req).user,
        req: sent.req,
      });

      // Then
      expect(principal).toMatchObject({
        kind: 'user',
        actorId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        isBypassUser: false,
        apiToken: { id: sent.tokenId, scope: ApiTokenScope.Read },
      });
    } finally {
      await sent.cleanup();
    }
  });

  it.each([
    { label: 'no request', req: undefined },
    { label: 'a request without a token', req: { headers: {} } },
  ])('should hold no token when the context has $label', async ({ req }) => {
    // Given
    const user = buildUser({ capabilities: [] });

    // When
    const principal = await buildPrincipal({ user, req });

    // Then
    expect(principal).toMatchObject({ kind: 'user', actorId: user.id });
    expect(principal).not.toHaveProperty('apiToken');
  });

  it('should hold no token for an SSE context, whose request is not the one the middleware authenticated', async () => {
    // Given
    const sent = await TestHelper.apiToken.send({
      userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
      organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      scope: ApiTokenScope.Admin,
    });
    const user = buildUser({ capabilities: [] });

    try {
      // When
      const principal = await buildPrincipal({
        user,
        req: { headers: sent.req.headers },
      });

      // Then
      expect(principal).toMatchObject({ kind: 'user', actorId: user.id });
      expect(principal).not.toHaveProperty('apiToken');
    } finally {
      await sent.cleanup();
    }
  });
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

describe('buildPlatformPrincipal', () => {
  it.each([
    { label: 'no session', user: undefined },
    {
      label: 'a BYPASS session',
      user: buildUser({ capabilities: [CAPABILITY_BYPASS] }),
    },
  ])(
    'should build a platform caller from the matching registration when the request has $label',
    async ({ user }) => {
      // Given
      givenRegistration(PLATFORM_ORGANIZATION);
      const lookup = vi.spyOn(
        PlatformConfigurationDomain,
        'loadResolvedConfigurationByPlatformAndToken'
      );
      const context = withPlatformHeaders(platformHeaders(), user);

      // When
      const principal = await buildPlatformPrincipal('registration')(context);

      // Then
      expect(principal).toEqual({
        kind: 'platform',
        actorId: PLATFORM_USER_UUID,
        platformId: PLATFORM_ID,
        organization: PLATFORM_ORGANIZATION,
        credential: 'registration',
        registration: REGISTRATION,
      });
      expect(lookup).toHaveBeenCalledExactlyOnceWith({
        platform_id: PLATFORM_ID,
        token: PLATFORM_TOKEN,
      });
    }
  );

  it('should take the platform id of the matched registration when the header is written in upper case', async () => {
    // Given
    givenRegistration(PLATFORM_ORGANIZATION);
    const context = withPlatformHeaders(
      platformHeaders(PLATFORM_ID.toUpperCase())
    );

    // When
    const principal = await buildPlatformPrincipal('registration')(context);

    // Then
    expect(principal).toMatchObject({
      kind: 'platform',
      platformId: PLATFORM_ID,
    });
  });

  it('should build a platform caller from the deployment request when the deployment request credential is required and no registration matches', async () => {
    // Given
    givenNoRegistration();
    givenDeploymentRequest(PLATFORM_ORGANIZATION);

    // When
    const principal = await buildPlatformPrincipal('deploymentRequest')(
      withPlatformHeaders(platformHeaders())
    );

    // Then
    expect(principal).toEqual({
      kind: 'platform',
      actorId: PLATFORM_USER_UUID,
      platformId: PLATFORM_ID,
      organization: PLATFORM_ORGANIZATION,
      credential: 'deploymentRequest',
      deploymentRequest: DEPLOYMENT_REQUEST,
    });
  });

  it('should fall back to the deployment request when the registration has no subscribed organization and the deployment request credential is required', async () => {
    // Given
    givenRegistration(null);
    givenDeploymentRequest(PLATFORM_ORGANIZATION);

    // When
    const principal = await buildPlatformPrincipal('deploymentRequest')(
      withPlatformHeaders(platformHeaders())
    );

    // Then
    expect(principal).toMatchObject({
      kind: 'platform',
      credential: 'deploymentRequest',
    });
  });

  it.each([
    DeploymentRequestHubStatus.Active,
    DeploymentRequestHubStatus.Pending,
    DeploymentRequestHubStatus.Provisioning,
  ])(
    'should build a platform caller from a deployment request in the %s status when the deployment request credential is required',
    async (hubStatus) => {
      // Given
      givenNoRegistration();
      givenDeploymentRequest(PLATFORM_ORGANIZATION, hubStatus);

      // When
      const principal = await buildPlatformPrincipal('deploymentRequest')(
        withPlatformHeaders(platformHeaders())
      );

      // Then
      expect(principal).toMatchObject({
        kind: 'platform',
        credential: 'deploymentRequest',
        deploymentRequest: { hub_status: hubStatus },
      });
    }
  );

  it.each([
    DeploymentRequestHubStatus.Cancelled,
    DeploymentRequestHubStatus.Expired,
    DeploymentRequestHubStatus.Failed,
    DeploymentRequestHubStatus.Queued,
  ])(
    'should build an anonymous principal and warn without the token when the deployment request is in the %s status',
    async (hubStatus) => {
      // Given
      const logWarn = vi
        .spyOn(logApp, 'warn')
        .mockImplementation(() => undefined);
      givenNoRegistration();
      givenDeploymentRequest(PLATFORM_ORGANIZATION, hubStatus);

      // When
      const principal = await buildPlatformPrincipal('deploymentRequest')(
        withPlatformHeaders(platformHeaders())
      );

      // Then
      expect(principal).toEqual({ kind: 'anonymous' });
      expect(logWarn).toHaveBeenCalledExactlyOnceWith(REJECTED_CREDENTIALS_LOG);
      expect(JSON.stringify(logWarn.mock.calls)).not.toContain(PLATFORM_TOKEN);
    }
  );

  it('should build an anonymous principal and warn when the registration credential is required and only a deployment request matches', async () => {
    // Given
    const logWarn = vi
      .spyOn(logApp, 'warn')
      .mockImplementation(() => undefined);
    givenNoRegistration();
    givenDeploymentRequest(PLATFORM_ORGANIZATION);

    // When
    const principal = await buildPlatformPrincipal('registration')(
      withPlatformHeaders(platformHeaders())
    );

    // Then
    expect(principal).toEqual({ kind: 'anonymous' });
    expect(logWarn).toHaveBeenCalledExactlyOnceWith(REJECTED_CREDENTIALS_LOG);
  });

  it('should build an anonymous principal and warn when the deployment request credential is required and a registration matches', async () => {
    // Given
    const logWarn = vi
      .spyOn(logApp, 'warn')
      .mockImplementation(() => undefined);
    givenRegistration(PLATFORM_ORGANIZATION);

    // When
    const principal = await buildPlatformPrincipal('deploymentRequest')(
      withPlatformHeaders(platformHeaders())
    );

    // Then
    expect(principal).toEqual({ kind: 'anonymous' });
    expect(logWarn).toHaveBeenCalledExactlyOnceWith(REJECTED_CREDENTIALS_LOG);
  });

  it('should build an anonymous principal and warn without the token when the registration is not active', async () => {
    // Given
    const logWarn = vi
      .spyOn(logApp, 'warn')
      .mockImplementation(() => undefined);
    givenRegistration(
      PLATFORM_ORGANIZATION,
      PlatformConfigurationStatus.Inactive
    );

    // When
    const principal = await buildPlatformPrincipal('registration')(
      withPlatformHeaders(platformHeaders())
    );

    // Then
    expect(principal).toEqual({ kind: 'anonymous' });
    expect(logWarn).toHaveBeenCalledExactlyOnceWith(REJECTED_CREDENTIALS_LOG);
    expect(JSON.stringify(logWarn.mock.calls)).not.toContain(PLATFORM_TOKEN);
  });

  it.each([
    { label: 'both headers are missing', headers: {} },
    {
      label: 'the platform id header is missing',
      headers: { [PLATFORM_TOKEN_HEADER]: PLATFORM_TOKEN },
    },
    {
      label: 'the platform token header is missing',
      headers: { [PLATFORM_ID_HEADER]: PLATFORM_ID },
    },
    {
      label: 'the platform token is empty',
      headers: platformHeaders(PLATFORM_ID, ''),
    },
    {
      label: 'the platform id is not a string',
      headers: { ...platformHeaders(), [PLATFORM_ID_HEADER]: [PLATFORM_ID] },
    },
  ])(
    'should build an anonymous principal without any lookup and without warning when $label',
    async ({ headers }) => {
      // Given
      const logWarn = vi
        .spyOn(logApp, 'warn')
        .mockImplementation(() => undefined);
      const registrationLookup = vi.spyOn(
        PlatformConfigurationDomain,
        'loadResolvedConfigurationByPlatformAndToken'
      );
      const deploymentRequestLookup = vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      );

      // When
      const principal = await buildPlatformPrincipal('registration')(
        withPlatformHeaders(headers)
      );

      // Then
      expect(principal).toEqual({ kind: 'anonymous' });
      expect(logWarn).not.toHaveBeenCalled();
      expect(registrationLookup).not.toHaveBeenCalled();
      expect(deploymentRequestLookup).not.toHaveBeenCalled();
    }
  );

  it('should build an anonymous principal despite a BYPASS session when there are no platform headers', async () => {
    // Given
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
    const context = withPlatformHeaders(
      {},
      buildUser({ capabilities: [CAPABILITY_BYPASS] })
    );

    // When
    const principal = await buildPlatformPrincipal('registration')(context);

    // Then
    expect(principal).toEqual({ kind: 'anonymous' });
  });

  it('should build an anonymous principal when the id and the token are not UUIDs and no deployment request matches', async () => {
    // Given
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
    givenNoDeploymentRequest();
    const context = withPlatformHeaders(
      platformHeaders('platform-abc', 'token-xyz')
    );

    // When
    const principal = await buildPlatformPrincipal('registration')(context);

    // Then
    expect(principal).toEqual({ kind: 'anonymous' });
  });

  it.each([
    {
      label: 'no registration and no deployment request match',
      given: () => {
        givenNoRegistration();
        givenNoDeploymentRequest();
      },
    },
    {
      label:
        'the registration has no organization and no deployment request matches',
      given: () => {
        givenRegistration(null);
        givenNoDeploymentRequest();
      },
    },
  ])(
    'should build an anonymous principal and warn without the token when $label',
    async ({ given }) => {
      // Given
      const logWarn = vi
        .spyOn(logApp, 'warn')
        .mockImplementation(() => undefined);
      given();

      // When
      const principal = await buildPlatformPrincipal('registration')(
        withPlatformHeaders(platformHeaders())
      );

      // Then
      expect(principal).toEqual({ kind: 'anonymous' });
      expect(logWarn).toHaveBeenCalledWith(REJECTED_CREDENTIALS_LOG);
      expect(JSON.stringify(logWarn.mock.calls)).not.toContain(PLATFORM_TOKEN);
    }
  );

  it('should let the error through when a lookup fails', async () => {
    // Given
    const failure = new Error('database unavailable');
    vi.spyOn(
      PlatformConfigurationDomain,
      'loadResolvedConfigurationByPlatformAndToken'
    ).mockRejectedValue(failure);

    // When
    const call = buildPlatformPrincipal('registration')(
      withPlatformHeaders(platformHeaders())
    );

    // Then
    await expect(call).rejects.toBe(failure);
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

  it('should call the resolver with a copied context holding the platform user and the platform caller when the platform headers are valid', async () => {
    // Given
    givenRegistration(PLATFORM_ORGANIZATION);
    const context = withPlatformHeaders(
      platformHeaders(),
      buildUser({ capabilities: [CAPABILITY_BYPASS] })
    );
    const snapshot = structuredClone(context);
    const platformUser = expect.objectContaining({
      id: PLATFORM_USER_UUID,
      selected_organization_id: PLATFORM_ORGANIZATION.id,
      selected_org_capabilities: [
        OrganizationCapability.ManagePlatformRegistration,
      ],
    });

    // When
    await TestResolvers.platformOnly(PARENT, ARGS, context, INFO);

    // Then
    expect(resolve).toHaveBeenCalledExactlyOnceWith(
      PARENT,
      ARGS,
      {
        ...context,
        user: platformUser,
        platformCaller: expect.objectContaining({
          kind: 'platform',
          credential: 'registration',
          registration: REGISTRATION,
        }),
      },
      INFO
    );
    expect(requestContext.update).toHaveBeenCalledExactlyOnceWith({
      user: platformUser,
    });
    expect(context).toEqual(snapshot);
  });

  it.each([
    { label: 'no headers and no session', context: { user: undefined } },
    {
      label: 'no headers and a BYPASS session',
      context: { user: buildUser({ capabilities: [CAPABILITY_BYPASS] }) },
    },
    {
      label: 'a valid system token and no platform headers',
      context: withSystemToken(TEST_SYSTEM_TOKEN),
    },
  ])(
    'should refuse with UNAUTHENTICATED and not call the resolver when a platform-only resolver gets $label',
    async ({ context }) => {
      // Given
      vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);

      // When
      const call = TestResolvers.platformOnly(PARENT, ARGS, context, INFO);

      // Then
      await expect(call).rejects.toMatchObject({
        message: UnauthenticatedErrorCode.Unauthenticated,
        extensions: { code: UnauthenticatedErrorCode.Unauthenticated },
      });
      expect(resolve).not.toHaveBeenCalled();
    }
  );

  it.each([
    {
      label: 'a deployment request token on a registration-only resolver',
      resolver: () => TestResolvers.platformOnly,
      given: () => {
        givenNoRegistration();
        givenDeploymentRequest(PLATFORM_ORGANIZATION);
      },
    },
    {
      label: 'a registration token on a deployment-request-only resolver',
      resolver: () => TestResolvers.deploymentRequestOnly,
      given: () => givenRegistration(PLATFORM_ORGANIZATION),
    },
    {
      label: 'an inactive registration on a registration-only resolver',
      resolver: () => TestResolvers.platformOnly,
      given: () =>
        givenRegistration(
          PLATFORM_ORGANIZATION,
          PlatformConfigurationStatus.Inactive
        ),
    },
    {
      label:
        'a cancelled deployment request on a deployment-request-only resolver',
      resolver: () => TestResolvers.deploymentRequestOnly,
      given: () => {
        givenNoRegistration();
        givenDeploymentRequest(
          PLATFORM_ORGANIZATION,
          DeploymentRequestHubStatus.Cancelled
        );
      },
    },
  ])(
    'should refuse with UNAUTHENTICATED and not call the resolver when it gets $label',
    async ({ resolver, given }) => {
      // Given
      vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
      given();
      const context = withPlatformHeaders(platformHeaders());

      // When
      const call = resolver()(PARENT, ARGS, context, INFO);

      // Then
      await expect(call).rejects.toMatchObject({
        message: UnauthenticatedErrorCode.Unauthenticated,
        extensions: { code: UnauthenticatedErrorCode.Unauthenticated },
      });
      expect(resolve).not.toHaveBeenCalled();
    }
  );

  it('should call a deployment-request-only resolver with the deployment request platform caller when the deployment request is accepted', async () => {
    // Given
    givenNoRegistration();
    givenDeploymentRequest(PLATFORM_ORGANIZATION);
    const context = withPlatformHeaders(platformHeaders());

    // When
    await TestResolvers.deploymentRequestOnly(PARENT, ARGS, context, INFO);

    // Then
    expect(resolve).toHaveBeenCalledOnce();
    expect(resolve.mock.calls[0]?.[2]).toMatchObject({
      platformCaller: {
        kind: 'platform',
        credential: 'deploymentRequest',
        deploymentRequest: DEPLOYMENT_REQUEST,
      },
    });
  });

  it('should not give the platform caller to the resolver of a system caller', async () => {
    // Given
    const context = withSystemToken(TEST_SYSTEM_TOKEN);

    // When
    await TestResolvers.systemOnly(PARENT, ARGS, context, INFO);

    // Then
    expect(resolve.mock.calls[0]?.[2]).not.toHaveProperty('platformCaller');
  });

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

  it('should hand the arguments of the operation to the guard', async () => {
    // Given
    const context = { user: buildUser() };

    // When
    await TestResolvers.argsRecorded(PARENT, ARGS, context, INFO);

    // Then
    expect(receivedArgs).toEqual([ARGS]);
    expect(resolve).toHaveBeenCalledOnce();
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
    {
      code: ForbiddenErrorCode.MissingCapabilityOnService,
      family: ErrorType.ForbiddenAccess,
    },
    { code: NotFoundErrorCode.NotFound, family: ErrorType.NotFound },
  ] as const)(
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

describe('requirePlatformCaller', () => {
  const registrationCaller: PlatformPrincipal = {
    kind: 'platform',
    actorId: PLATFORM_USER_UUID,
    platformId: PLATFORM_ID,
    organization: PLATFORM_ORGANIZATION,
    credential: 'registration',
    registration: REGISTRATION,
  };

  it('should return the platform caller when it holds the required credential', () => {
    // When
    const caller = requirePlatformCaller(
      { platformCaller: registrationCaller },
      'registration'
    );

    // Then
    expect(caller).toBe(registrationCaller);
    expect(caller.registration).toBe(REGISTRATION);
  });

  it.each([
    { label: 'no platform caller', context: {}, credential: 'registration' },
    {
      label: 'a platform caller holding another credential',
      context: { platformCaller: registrationCaller },
      credential: 'deploymentRequest',
    },
  ] as const)(
    'should throw when the context has $label',
    ({ context, credential }) => {
      // When
      const call = () => requirePlatformCaller(context, credential);

      // Then
      expect(call).toThrow(`A ${credential} platform caller is required`);
    }
  );
});
