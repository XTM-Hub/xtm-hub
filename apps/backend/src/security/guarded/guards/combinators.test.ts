import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  ApiTokenScope,
  OrganizationCapability,
  PortalCapability,
  ServiceRestriction,
} from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { allow, DenialCode, deny, Guard } from '../guard.types';
import { buildPrincipal } from '../principal';
import { fromArg } from '../sources';
import { sessionCallerGuard, systemCallerGuard } from './caller.guard';
import { allOf, anyOf } from './combinators';
import { orgGuard, selectedOrganization } from './organization.guard';
import { serviceGuard } from './service.guard';

const { ANONYMOUS, ORGANIZATION_ID, buildUserPrincipal } =
  TestHelper.guardFixtures;

const SERVICE_INSTANCE_ID =
  '11111111-1111-4111-8111-111111111111' as ServiceInstanceId;

type InstanceArgs = { instanceId: ServiceInstanceId };
const fromInstanceArg = fromArg<InstanceArgs, 'instanceId'>('instanceId');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('anyOf', () => {
  const allowing = (organizationId: string): Guard => ({
    check: vi.fn(() =>
      allow({
        kind: 'organization',
        organizationId: organizationId as OrganizationId,
      })
    ),
    principalFrom: buildPrincipal,
  });
  const denying = (code: DenialCode): Guard => ({
    check: vi.fn(() => deny(code)),
    principalFrom: buildPrincipal,
  });

  it('should return the result of the first guard that allows and not run the next ones', async () => {
    // Given
    const first = allowing('first');
    const second = allowing('second');
    const guard = anyOf(first, second);

    // When
    const result = await guard.check(buildUserPrincipal(), {});

    // Then
    expect(result).toEqual({
      allowed: true,
      checked: { kind: 'organization', organizationId: 'first' },
    });
    expect(second.check).not.toHaveBeenCalled();
  });

  it('should return the result of a later guard when the earlier ones deny, in written order', async () => {
    // Given
    const first = denying(ForbiddenErrorCode.MissingCapabilityOnOrganization);
    const second = allowing('second');
    const guard = anyOf(first, second);

    // When
    const result = await guard.check(buildUserPrincipal(), {});

    // Then
    expect(result).toEqual({
      allowed: true,
      checked: { kind: 'organization', organizationId: 'second' },
    });
    expect(first.check).toHaveBeenCalledOnce();
  });

  it.each([
    {
      label: 'UNAUTHENTICATED over everything',
      codes: [
        ForbiddenErrorCode.MissingCapabilityOnOrganization,
        UnauthenticatedErrorCode.Unauthenticated,
      ],
      expected: UnauthenticatedErrorCode.Unauthenticated,
    },
    {
      label:
        'NOT_ALLOWED_WITH_API_TOKEN over MISSING_CAPABILITY_*, FORBIDDEN_ACCESS and NOT_FOUND',
      codes: [
        NotFoundErrorCode.NotFound,
        ForbiddenErrorCode.ForbiddenAccess,
        ForbiddenErrorCode.MissingCapabilityOnOrganization,
        ForbiddenErrorCode.NotAllowedWithApiToken,
      ],
      expected: ForbiddenErrorCode.NotAllowedWithApiToken,
    },
    {
      label:
        'the first MISSING_CAPABILITY_* over FORBIDDEN_ACCESS and NOT_FOUND',
      codes: [
        NotFoundErrorCode.NotFound,
        ForbiddenErrorCode.MissingCapabilityOnService,
        ForbiddenErrorCode.ForbiddenAccess,
        ForbiddenErrorCode.MissingCapabilityOnOrganization,
      ],
      expected: ForbiddenErrorCode.MissingCapabilityOnService,
    },
    {
      label: 'FORBIDDEN_ACCESS over NOT_FOUND',
      codes: [NotFoundErrorCode.NotFound, ForbiddenErrorCode.ForbiddenAccess],
      expected: ForbiddenErrorCode.ForbiddenAccess,
    },
    {
      label: 'NOT_FOUND when every guard answers NOT_FOUND',
      codes: [NotFoundErrorCode.NotFound, NotFoundErrorCode.NotFound],
      expected: NotFoundErrorCode.NotFound,
    },
  ])('should refuse with $label', async ({ codes, expected }) => {
    // Given
    const [first, second, ...rest] = (codes as DenialCode[]).map((code) =>
      denying(code)
    );
    const guard = anyOf(first!, second!, ...rest);

    // When
    const result = await guard.check(buildUserPrincipal(), {});

    // Then
    expect(result).toEqual({ allowed: false, code: expected });
  });

  it('should refuse a guard that returns nothing as FORBIDDEN_ACCESS', async () => {
    // Given
    const malformed: Guard = {
      check: () => undefined as never,
      principalFrom: buildPrincipal,
    };
    const guard = anyOf(malformed, denying(NotFoundErrorCode.NotFound));

    // When
    const result = await guard.check(buildUserPrincipal(), {});

    // Then
    expect(result).toEqual({
      allowed: false,
      code: ForbiddenErrorCode.ForbiddenAccess,
    });
  });

  it('should throw at construction when the guards do not build the same principal', () => {
    // Given
    const userGuard = orgGuard({
      organization: selectedOrganization,
      capabilities: [],
    });
    const machineGuard = systemCallerGuard([PortalCapability.GenerateManifest]);

    // When
    const build = () => anyOf(userGuard, machineGuard);

    // Then
    expect(build).toThrow('anyOf needs guards that build the same principal');
  });

  it('should refuse an anonymous visitor with UNAUTHENTICATED without running any source', async () => {
    // Given
    const serviceInstance = vi.fn(fromInstanceArg);
    const guard = anyOf<InstanceArgs>(
      orgGuard<InstanceArgs>({
        organization: selectedOrganization,
        capabilities: [OrganizationCapability.ManageSubscription],
      }),
      serviceGuard<InstanceArgs>({
        serviceInstance,
        capabilities: [ServiceRestriction.ManageAccess],
      })
    );

    // When
    const result = await guard.check(ANONYMOUS, {
      instanceId: SERVICE_INSTANCE_ID,
    });

    // Then
    expect(result).toEqual({
      allowed: false,
      code: UnauthenticatedErrorCode.Unauthenticated,
    });
    expect(serviceInstance).not.toHaveBeenCalled();
  });
});

describe('allOf', () => {
  const allowing = (organizationId: string): Guard => ({
    check: vi.fn(() =>
      allow({
        kind: 'organization',
        organizationId: organizationId as OrganizationId,
      })
    ),
    principalFrom: buildPrincipal,
  });
  const denying = (code: DenialCode): Guard => ({
    check: vi.fn(() => deny(code)),
    principalFrom: buildPrincipal,
  });

  it('should return the result of the last guard when every guard allows, each one run in written order', async () => {
    // Given
    const first = allowing('first');
    const second = allowing('second');
    const guard = allOf(first, second);

    // When
    const result = await guard.check(buildUserPrincipal(), {});

    // Then
    expect(result).toEqual({
      allowed: true,
      checked: { kind: 'organization', organizationId: 'second' },
    });
    expect(first.check).toHaveBeenCalledOnce();
    expect(second.check).toHaveBeenCalledOnce();
  });

  it('should refuse with the code of the first denial and not run the next guards', async () => {
    // Given
    const next = allowing('next');
    const guard = allOf(
      allowing('first'),
      denying(ForbiddenErrorCode.NotAllowedWithApiToken),
      denying(UnauthenticatedErrorCode.Unauthenticated),
      next
    );

    // When
    const result = await guard.check(buildUserPrincipal(), {});

    // Then
    expect(result).toEqual({
      allowed: false,
      code: ForbiddenErrorCode.NotAllowedWithApiToken,
    });
    expect(next.check).not.toHaveBeenCalled();
  });

  it('should refuse a guard that returns nothing as FORBIDDEN_ACCESS', async () => {
    // Given
    const malformed: Guard = {
      check: vi.fn().mockReturnValue(undefined),
      principalFrom: buildPrincipal,
    };
    const guard = allOf(allowing('first'), malformed);

    // When
    const result = await guard.check(buildUserPrincipal(), {});

    // Then
    expect(result).toEqual({
      allowed: false,
      code: ForbiddenErrorCode.ForbiddenAccess,
    });
  });

  it('should throw at construction when the guards do not build the same principal', () => {
    // Given
    const userGuard = orgGuard({
      organization: selectedOrganization,
      capabilities: [],
    });
    const machineGuard = systemCallerGuard([PortalCapability.GenerateManifest]);

    // When
    const build = () => allOf(userGuard, machineGuard);

    // Then
    expect(build).toThrow('allOf needs guards that build the same principal');
  });

  it('should pass what the last guard checked to the checks of its targets', async () => {
    // Given
    const check = vi.fn(() => allow());
    const guard = allOf(
      sessionCallerGuard(),
      orgGuard({ organization: selectedOrganization, capabilities: [] })
    ).targets(check);
    const principal = buildUserPrincipal({
      memberships: { [ORGANIZATION_ID]: [] },
    });

    // When
    await guard.check(principal, {});

    // Then
    expect(check).toHaveBeenCalledExactlyOnceWith(
      principal,
      {},
      {
        kind: 'organization',
        organizationId: ORGANIZATION_ID,
      }
    );
  });

  it('should refuse an API token with NOT_ALLOWED_WITH_API_TOKEN before its organization is read', async () => {
    // Given
    const organization = vi.fn(selectedOrganization);
    const guard = allOf(
      sessionCallerGuard(),
      orgGuard({ organization, capabilities: [] })
    );
    const principal = buildUserPrincipal({
      memberships: { [ORGANIZATION_ID]: [] },
      apiTokenScope: ApiTokenScope.Admin,
    });

    // When
    const result = await guard.check(principal, {});

    // Then
    expect(result).toEqual({
      allowed: false,
      code: ForbiddenErrorCode.NotAllowedWithApiToken,
    });
    expect(organization).not.toHaveBeenCalled();
  });
});
