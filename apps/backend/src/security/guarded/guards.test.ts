import { describe, expect, it } from 'vitest';
import { PortalCapability } from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';
import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { bypassOnlyGuard, portalCapabilityGuard } from './guards/portal.guard';
import { publicAccess } from './guards/public-access.guard';
import { Principal } from './principal';

const USER_ID = 'user-id' as UserId;
const ORGANIZATION_ID = 'organization-id' as OrganizationId;

const buildUserPrincipal = (
  overrides: {
    isBypassUser?: boolean;
    capabilities?: PortalCapability[];
  } = {}
): Principal => ({
  kind: 'user',
  actorId: USER_ID,
  isBypassUser: overrides.isBypassUser ?? false,
  portalCapabilities: new Set(overrides.capabilities ?? []),
  selectedOrganizationId: ORGANIZATION_ID,
});

const ANONYMOUS: Principal = { kind: 'anonymous' };

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
  ])('should answer $label', async ({ principal, expected }) => {
    // Given
    const guard = bypassOnlyGuard();

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
