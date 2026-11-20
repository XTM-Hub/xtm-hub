import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { PortalCapability } from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { NotFoundErrorCode } from '../../utils/error/error.code';
import { orgGuard } from './guards/organization.guard';
import { fromArg } from './sources';

const {
  ANONYMOUS,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  buildSystemPrincipal,
  buildUserPrincipal,
} = TestHelper.guardFixtures;

describe('sources', () => {
  type OrganizationArgs = { organizationId: OrganizationId };

  it('should read the organization from an argument of the operation', async () => {
    // Given
    const guard = orgGuard<OrganizationArgs>({
      organization: fromArg('organizationId'),
      capabilities: [],
    });
    const principal = buildUserPrincipal({
      memberships: { [OTHER_ORGANIZATION_ID]: [] },
    });

    // When
    const result = await guard.check(principal, {
      organizationId: OTHER_ORGANIZATION_ID,
    });

    // Then
    expect(result).toEqual({
      allowed: true,
      checked: { kind: 'organization', organizationId: OTHER_ORGANIZATION_ID },
    });
  });

  it('should refuse with NOT_FOUND a user who is not a member of the organization of the argument', async () => {
    // Given
    const guard = orgGuard<OrganizationArgs>({
      organization: fromArg('organizationId'),
      capabilities: [],
    });
    const principal = buildUserPrincipal({
      memberships: { [ORGANIZATION_ID]: [] },
    });

    // When
    const result = await guard.check(principal, {
      organizationId: OTHER_ORGANIZATION_ID,
    });

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
  });

  it('should refuse with NOT_FOUND when the source gives no organization', async () => {
    // Given
    const guard = orgGuard<Partial<OrganizationArgs>>({
      organization: (_caller, { organizationId }) => organizationId,
      capabilities: [],
    });

    // When
    const result = await guard.check(buildUserPrincipal(), {});

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
  });

  it.each([
    { label: 'an anonymous visitor', principal: ANONYMOUS },
    {
      label: 'a system caller',
      principal: buildSystemPrincipal([PortalCapability.Bypass]),
    },
    {
      label: 'a BYPASS user',
      principal: buildUserPrincipal({ isBypassUser: true }),
    },
  ])('should never run the source for $label', async ({ principal }) => {
    // Given
    const source = vi.fn(() => ORGANIZATION_ID);
    const guard = orgGuard({ organization: source, capabilities: [] });

    // When
    await guard.check(principal, {});

    // Then
    expect(source).not.toHaveBeenCalled();
  });
});
