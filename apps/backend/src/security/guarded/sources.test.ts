import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { PortalCapability } from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { NotFoundErrorCode } from '../../utils/error/error.code';
import { CallerOf } from './guard.types';
import { orgGuard } from './guards/organization.guard';
import { fromArg, fromRecord } from './sources';

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

describe('fromRecord', () => {
  type Args = { id: string };
  type Row = { organizationId: string; ownerId: string };
  const caller = buildUserPrincipal() as CallerOf<'user'>;

  it('should load the record once for the sources picked from it with the same arguments', async () => {
    // Given
    const load = vi.fn((_args: Args) =>
      Promise.resolve({ organizationId: 'organization', ownerId: 'owner' })
    );
    const record = fromRecord<Args, Row>(load);
    const organization = record.pick(({ organizationId }) => organizationId);
    const owner = record.pick(({ ownerId }) => ownerId);
    const args = { id: 'row-id' };

    // When
    const values = [
      await organization(caller, args),
      await owner(caller, args),
      await organization(caller, args),
    ];

    // Then
    expect(values).toEqual(['organization', 'owner', 'organization']);
    expect(load).toHaveBeenCalledExactlyOnceWith(args);
  });

  it('should load again for the arguments of another call, even with the same values', async () => {
    // Given
    const load = vi.fn((_args: Args) =>
      Promise.resolve({ organizationId: 'organization', ownerId: 'owner' })
    );
    const organization = fromRecord<Args, Row>(load).pick(
      ({ organizationId }) => organizationId
    );

    const first = { id: 'row-id' };

    // When
    await organization(caller, first);
    await organization(caller, first);

    // Then
    expect(load).toHaveBeenCalledTimes(1);

    // When
    await organization(caller, { id: 'row-id' });

    // Then
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('should give no id when the loader finds no record', async () => {
    // Given
    const organization = fromRecord<Args, Row>(() =>
      Promise.resolve(undefined)
    ).pick(({ organizationId }) => organizationId);

    // When
    const result = await organization(caller, { id: 'unknown' });

    // Then
    expect(result).toBeUndefined();
  });
});
