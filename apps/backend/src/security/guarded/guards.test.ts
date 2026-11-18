import { describe, expect, it } from 'vitest';
import { contextSimpleUserFiligran2 } from '../../../tests/tests.const';
import {
  OrganizationCapability,
  PortalCapability,
} from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';
import { OrganizationHelper } from '../../modules/organization-management/organization/organization.helper';
import { SYSTEM_USER_UUID } from '../../portal.const';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { callerGuard } from './guards/caller.guard';
import { orgGuard, selectedOrganization } from './guards/organization.guard';
import {
  bypassOnlyGuard,
  loggedInGuard,
  portalCapabilityGuard,
} from './guards/portal.guard';
import { publicAccess } from './guards/public-access.guard';
import { buildPrincipal, Principal } from './principal';

const USER_ID = 'user-id' as UserId;
const ORGANIZATION_ID = 'organization-id' as OrganizationId;
const OTHER_ORGANIZATION_ID = 'other-organization-id' as OrganizationId;
const PERSONAL_SPACE_ID = OrganizationHelper.personalSpaceIdOf({ id: USER_ID });

const buildUserPrincipal = (
  overrides: {
    isBypassUser?: boolean;
    capabilities?: PortalCapability[];
    selectedOrganizationId?: OrganizationId;
    memberships?: Record<string, OrganizationCapability[]>;
  } = {}
): Principal => ({
  kind: 'user',
  actorId: USER_ID,
  isBypassUser: overrides.isBypassUser ?? false,
  portalCapabilities: new Set(overrides.capabilities ?? []),
  selectedOrganizationId: overrides.selectedOrganizationId ?? ORGANIZATION_ID,
  memberships: Object.entries(overrides.memberships ?? {}).map(
    ([organizationId, capabilities]) => ({
      id: organizationId,
      organization: { id: organizationId as OrganizationId },
      capabilities,
    })
  ),
});

const ANONYMOUS: Principal = { kind: 'anonymous' };

const buildSystemPrincipal = (
  capabilities: PortalCapability[] = []
): Principal => ({
  kind: 'system',
  actorId: SYSTEM_USER_UUID,
  portalCapabilities: new Set(capabilities),
});

describe('publicAccess guard', () => {
  it.each([
    { label: 'an anonymous visitor', principal: ANONYMOUS },
    { label: 'a user', principal: buildUserPrincipal() },
    {
      label: 'a BYPASS user',
      principal: buildUserPrincipal({ isBypassUser: true }),
    },
  ])('should allow $label', async ({ principal }) => {
    // Given the public guard

    // When
    const result = await publicAccess(principal);

    // Then
    expect(result).toEqual({ allowed: true });
  });
});

describe('bypassOnlyGuard', () => {
  it.each([
    {
      label: 'an anonymous visitor',
      principal: ANONYMOUS,
      expected: {
        allowed: false,
        code: UnauthenticatedErrorCode.Unauthenticated,
      },
    },
    {
      label: 'a user without any capability',
      principal: buildUserPrincipal(),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a user with another capability',
      principal: buildUserPrincipal({
        capabilities: [PortalCapability.ManageDeployment],
      }),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a BYPASS user',
      principal: buildUserPrincipal({
        isBypassUser: true,
        capabilities: [PortalCapability.Bypass],
      }),
      expected: { allowed: true },
    },
    {
      label: 'a system caller',
      principal: buildSystemPrincipal([PortalCapability.Bypass]),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
  ])('should answer $label', async ({ principal, expected }) => {
    // Given
    const guard = bypassOnlyGuard();

    // When
    const result = await guard(principal);

    // Then
    expect(result).toEqual(expected);
  });
});

describe('loggedInGuard', () => {
  it.each([
    {
      label: 'an anonymous visitor',
      principal: ANONYMOUS,
      expected: {
        allowed: false,
        code: UnauthenticatedErrorCode.Unauthenticated,
      },
    },
    {
      label: 'a user without any capability',
      principal: buildUserPrincipal(),
      expected: { allowed: true },
    },
    {
      label: 'a BYPASS user',
      principal: buildUserPrincipal({
        isBypassUser: true,
        capabilities: [PortalCapability.Bypass],
      }),
      expected: { allowed: true },
    },
    {
      label: 'a system caller',
      principal: buildSystemPrincipal([PortalCapability.Bypass]),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
  ])('should answer $label', async ({ principal, expected }) => {
    // Given
    const guard = loggedInGuard();

    // When
    const result = await guard(principal);

    // Then
    expect(result).toEqual(expected);
  });
});

describe('portalCapabilityGuard', () => {
  it.each([
    {
      label: 'an anonymous visitor',
      principal: ANONYMOUS,
      expected: {
        allowed: false,
        code: UnauthenticatedErrorCode.Unauthenticated,
      },
    },
    {
      label: 'a user without any capability',
      principal: buildUserPrincipal(),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a user with another capability',
      principal: buildUserPrincipal({
        capabilities: [PortalCapability.ReadTrials],
      }),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a BYPASS user',
      principal: buildUserPrincipal({
        isBypassUser: true,
        capabilities: [PortalCapability.Bypass],
      }),
      expected: { allowed: true },
    },
    {
      label: 'a user holding the named capability',
      principal: buildUserPrincipal({
        capabilities: [PortalCapability.ManageDeployment],
      }),
      expected: { allowed: true },
    },
    {
      label: 'a system caller holding the named capability',
      principal: buildSystemPrincipal([PortalCapability.ManageDeployment]),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
  ])(
    'should answer $label for the ManageDeployment capability',
    async ({ principal, expected }) => {
      // Given
      const guard = portalCapabilityGuard([PortalCapability.ManageDeployment]);

      // When
      const result = await guard(principal);

      // Then
      expect(result).toEqual(expected);
    }
  );

  it('should allow a user holding any one of the named capabilities', async () => {
    // Given
    const guard = portalCapabilityGuard([
      PortalCapability.ManageDeployment,
      PortalCapability.ModifyTrials,
    ]);
    const principal = buildUserPrincipal({
      capabilities: [PortalCapability.ModifyTrials],
    });

    // When
    const result = await guard(principal);

    // Then
    expect(result).toEqual({ allowed: true });
  });
});

describe('callerGuard for a system caller', () => {
  it.each([
    {
      label: 'an anonymous visitor',
      principal: ANONYMOUS,
      expected: {
        allowed: false,
        code: UnauthenticatedErrorCode.Unauthenticated,
      },
    },
    {
      label: 'a user holding the scope',
      principal: buildUserPrincipal({
        capabilities: [PortalCapability.GenerateManifest],
      }),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a BYPASS user',
      principal: buildUserPrincipal({
        isBypassUser: true,
        capabilities: [PortalCapability.Bypass],
      }),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a system caller without the scope',
      principal: buildSystemPrincipal(),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a system caller holding another scope only',
      principal: buildSystemPrincipal([PortalCapability.ManageDeployment]),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a system caller holding the scope',
      principal: buildSystemPrincipal([PortalCapability.GenerateManifest]),
      expected: { allowed: true },
    },
  ])(
    'should answer $label for the GenerateManifest scope',
    async ({ principal, expected }) => {
      // Given
      const guard = callerGuard('system', [PortalCapability.GenerateManifest]);

      // When
      const result = await guard(principal);

      // Then
      expect(result).toEqual(expected);
    }
  );

  it('should refuse a system caller when it misses one of the declared scopes', async () => {
    // Given
    const guard = callerGuard('system', [
      PortalCapability.GenerateManifest,
      PortalCapability.ManageDeployment,
    ]);
    const principal = buildSystemPrincipal([PortalCapability.GenerateManifest]);

    // When
    const result = await guard(principal);

    // Then
    expect(result).toEqual({
      allowed: false,
      code: ForbiddenErrorCode.ForbiddenAccess,
    });
  });
});

describe('orgGuard on the selected organization', () => {
  it.each([
    {
      label: 'an anonymous visitor',
      principal: ANONYMOUS,
      expected: {
        allowed: false,
        code: UnauthenticatedErrorCode.Unauthenticated,
      },
    },
    {
      label: 'a system caller',
      principal: buildSystemPrincipal([PortalCapability.Bypass]),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
    {
      label: 'a BYPASS user who is not a member',
      principal: buildUserPrincipal({
        isBypassUser: true,
        memberships: {},
      }),
      expected: { allowed: true },
    },
    {
      label: 'a user who is not a member',
      principal: buildUserPrincipal({
        memberships: {
          [OTHER_ORGANIZATION_ID]: [
            OrganizationCapability.AdministrateOrganization,
          ],
        },
      }),
      expected: { allowed: false, code: NotFoundErrorCode.NotFound },
    },
    {
      label: 'a member holding the capability',
      principal: buildUserPrincipal({
        memberships: {
          [ORGANIZATION_ID]: [OrganizationCapability.ManageSubscription],
        },
      }),
      expected: { allowed: true },
    },
    {
      label: 'a member holding ADMINISTRATE_ORGANIZATION',
      principal: buildUserPrincipal({
        memberships: {
          [ORGANIZATION_ID]: [OrganizationCapability.AdministrateOrganization],
        },
      }),
      expected: { allowed: true },
    },
    {
      label: 'a member holding the capability in another organization only',
      principal: buildUserPrincipal({
        memberships: {
          [ORGANIZATION_ID]: [OrganizationCapability.ManageAccess],
          [OTHER_ORGANIZATION_ID]: [OrganizationCapability.ManageSubscription],
        },
      }),
      expected: {
        allowed: false,
        code: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      },
    },
  ])(
    'should answer $label for the ManageSubscription capability',
    async ({ principal, expected }) => {
      // Given
      const guard = orgGuard({
        organization: selectedOrganization,
        capabilities: [OrganizationCapability.ManageSubscription],
      });

      // When
      const result = await guard(principal);

      // Then
      expect(result).toEqual(expected);
    }
  );

  it('should allow a member holding any one of the named capabilities', async () => {
    // Given
    const guard = orgGuard({
      organization: selectedOrganization,
      capabilities: [
        OrganizationCapability.ManageAccess,
        OrganizationCapability.ManageSubscription,
      ],
    });
    const principal = buildUserPrincipal({
      memberships: {
        [ORGANIZATION_ID]: [OrganizationCapability.ManageSubscription],
      },
    });

    // When
    const result = await guard(principal);

    // Then
    expect(result).toEqual({ allowed: true });
  });

  it.each([
    {
      label: 'a member without any capability',
      memberships: { [ORGANIZATION_ID]: [] },
      expected: { allowed: true },
    },
    {
      label: 'a user who is not a member',
      memberships: { [OTHER_ORGANIZATION_ID]: [] },
      expected: { allowed: false, code: NotFoundErrorCode.NotFound },
    },
    {
      label: 'a user on its own personal space',
      selectedOrganizationId: PERSONAL_SPACE_ID,
      memberships: {
        [PERSONAL_SPACE_ID]: [OrganizationCapability.AdministrateOrganization],
      },
      expected: { allowed: true },
    },
  ])(
    'should answer $label when only the membership is required',
    async ({ selectedOrganizationId, memberships, expected }) => {
      // Given
      const guard = orgGuard({
        organization: selectedOrganization,
        capabilities: [],
      });

      // When
      const result = await guard(
        buildUserPrincipal({ selectedOrganizationId, memberships })
      );

      // Then
      expect(result).toEqual(expected);
    }
  );

  it('should refuse with NOT_FOUND a user whose session has no organization capabilities', async () => {
    // Given
    const guard = orgGuard({
      organization: selectedOrganization,
      capabilities: [],
    });
    const principal = await buildPrincipal({
      user: {
        ...structuredClone(contextSimpleUserFiligran2.user),
        organization_capabilities: undefined,
      },
    });

    // When
    const result = await guard(principal);

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
  });
});
