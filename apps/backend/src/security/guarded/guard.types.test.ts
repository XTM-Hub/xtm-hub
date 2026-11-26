import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { allow, deny } from './guard.types';
import { orgGuard, selectedOrganization } from './guards/organization.guard';

const { ANONYMOUS, ORGANIZATION_ID, buildUserPrincipal } =
  TestHelper.guardFixtures;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('targets', () => {
  const memberGuard = () =>
    orgGuard({ organization: selectedOrganization, capabilities: [] });
  const member = () =>
    buildUserPrincipal({ memberships: { [ORGANIZATION_ID]: [] } });

  it('should run the checks with the arguments and what the guard checked once it allows', async () => {
    // Given
    const check = vi.fn(() => allow());
    const guard = memberGuard().targets(check);
    const principal = member();

    // When
    const result = await guard.check(principal, { id: 'row-id' });

    // Then
    expect(check).toHaveBeenCalledExactlyOnceWith(
      principal,
      { id: 'row-id' },
      { kind: 'organization', organizationId: ORGANIZATION_ID }
    );
    expect(result).toMatchObject({ allowed: true });
  });

  it('should not run the checks when the guard denies', async () => {
    // Given
    const check = vi.fn(() => allow());
    const guard = memberGuard().targets(check);

    // When
    const result = await guard.check(ANONYMOUS, {});

    // Then
    expect(result).toEqual({
      allowed: false,
      code: UnauthenticatedErrorCode.Unauthenticated,
    });
    expect(check).not.toHaveBeenCalled();
  });

  it('should refuse with the first denial of the checks and not run the next ones', async () => {
    // Given
    const next = vi.fn(() => allow());
    const guard = memberGuard().targets(
      () => deny(NotFoundErrorCode.NotFound),
      next
    );

    // When
    const result = await guard.check(member(), {});

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should keep the principal builder of the guard', () => {
    // Given
    const guard = memberGuard();

    // Then
    expect(guard.targets().principalFrom).toBe(guard.principalFrom);
  });
});
