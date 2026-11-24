import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  PortalCapability,
  ServiceRestriction,
} from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { AuthHelper } from '../../../modules/security-management/capability/auth.helper';
import { logApp } from '../../../utils/app-logger.util';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { fromArg } from '../sources';
import { serviceGuard } from './service.guard';

const {
  ANONYMOUS,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  USER_ID,
  buildRegistrationPlatformPrincipal,
  buildSystemPrincipal,
  buildUserPrincipal,
} = TestHelper.guardFixtures;

const buildMember = () =>
  buildUserPrincipal({ memberships: { [ORGANIZATION_ID]: [] } });

const SERVICE_INSTANCE_ID =
  '11111111-1111-4111-8111-111111111111' as ServiceInstanceId;

type InstanceArgs = { instanceId: ServiceInstanceId };
const fromInstanceArg = fromArg<InstanceArgs, 'instanceId'>('instanceId');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('serviceGuard', () => {
  const buildGuard = () =>
    serviceGuard<InstanceArgs>({
      serviceInstance: fromInstanceArg,
      capabilities: [ServiceRestriction.ManageAccess],
    });
  const ARGS_WITH_INSTANCE: InstanceArgs = { instanceId: SERVICE_INSTANCE_ID };

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
      label: 'a platform caller',
      principal: buildRegistrationPlatformPrincipal(),
      expected: { allowed: false, code: ForbiddenErrorCode.ForbiddenAccess },
    },
  ])(
    'should answer $label without any lookup',
    async ({ principal, expected }) => {
      // Given
      const load = vi.spyOn(AuthHelper, 'loadCapabilitiesByServiceId');

      // When
      const result = await buildGuard().check(principal, ARGS_WITH_INSTANCE);

      // Then
      expect(result).toEqual(expected);
      expect(load).not.toHaveBeenCalled();
    }
  );

  it('should allow a BYPASS user as an admin without reading the service instance nor querying', async () => {
    // Given
    const load = vi.spyOn(AuthHelper, 'loadCapabilitiesByServiceId');
    const serviceInstance = vi.fn(fromInstanceArg);
    const guard = serviceGuard<InstanceArgs>({
      serviceInstance,
      capabilities: [ServiceRestriction.ManageAccess],
    });

    // When
    const result = await guard.check(
      buildUserPrincipal({ isBypassUser: true }),
      ARGS_WITH_INSTANCE
    );

    // Then
    expect(result).toEqual({ allowed: true, checked: { kind: 'admin' } });
    expect(serviceInstance).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'no membership', memberships: {} },
    {
      label: 'a membership on another organization only',
      memberships: { [OTHER_ORGANIZATION_ID]: [] },
    },
  ])(
    'should refuse with NOT_FOUND, without reading the service instance nor querying, a user with $label',
    async ({ memberships }) => {
      // Given
      const load = vi.spyOn(AuthHelper, 'loadCapabilitiesByServiceId');
      const serviceInstance = vi.fn(fromInstanceArg);
      const guard = serviceGuard<InstanceArgs>({
        serviceInstance,
        capabilities: [ServiceRestriction.ManageAccess],
      });

      // When
      const result = await guard.check(
        buildUserPrincipal({ memberships }),
        ARGS_WITH_INSTANCE
      );

      // Then
      expect(result).toEqual({
        allowed: false,
        code: NotFoundErrorCode.NotFound,
      });
      expect(serviceInstance).not.toHaveBeenCalled();
      expect(load).not.toHaveBeenCalled();
    }
  );

  it('should refuse with NOT_FOUND without querying when the source gives no service instance', async () => {
    // Given
    const load = vi.spyOn(AuthHelper, 'loadCapabilitiesByServiceId');

    // When
    const result = await buildGuard().check(buildMember(), {} as InstanceArgs);

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'the service instance does not exist', access: undefined },
    {
      label: 'the caller has no access row on the service instance',
      access: { capabilities: null, is_member: false },
    },
  ])('should refuse with NOT_FOUND when $label', async ({ access }) => {
    // Given
    vi.spyOn(AuthHelper, 'loadCapabilitiesByServiceId').mockResolvedValue(
      access
    );

    // When
    const result = await buildGuard().check(buildMember(), ARGS_WITH_INSTANCE);

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
  });

  it.each([
    { label: 'no capability row', capabilities: null },
    { label: 'another capability only', capabilities: ['ACCESS'] },
  ])(
    'should refuse with MISSING_CAPABILITY_ON_SERVICE a member with $label',
    async ({ capabilities }) => {
      // Given
      vi.spyOn(AuthHelper, 'loadCapabilitiesByServiceId').mockResolvedValue({
        capabilities,
        is_member: true,
      });

      // When
      const result = await buildGuard().check(
        buildMember(),
        ARGS_WITH_INSTANCE
      );

      // Then
      expect(result).toEqual({
        allowed: false,
        code: ForbiddenErrorCode.MissingCapabilityOnService,
      });
    }
  );

  it('should refuse with NOT_FOUND, without a query nor an error log, a service instance id that is not a uuid', async () => {
    // Given
    const load = vi.spyOn(AuthHelper, 'loadCapabilitiesByServiceId');
    const logError = vi
      .spyOn(logApp, 'error')
      .mockImplementation(() => undefined);

    // When
    const result = await buildGuard().check(buildMember(), {
      instanceId: 'not-a-uuid' as ServiceInstanceId,
    });

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
    expect(load).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('should allow a member holding the capability, checked on the service instance and the selected organization', async () => {
    // Given
    const load = vi
      .spyOn(AuthHelper, 'loadCapabilitiesByServiceId')
      .mockResolvedValue({
        capabilities: ['ACCESS', 'MANAGE_ACCESS'],
        is_member: true,
      });

    // When
    const result = await buildGuard().check(buildMember(), ARGS_WITH_INSTANCE);

    // Then
    expect(result).toEqual({
      allowed: true,
      checked: {
        kind: 'serviceInstance',
        serviceInstanceId: SERVICE_INSTANCE_ID,
        organizationId: ORGANIZATION_ID,
      },
    });
    expect(load).toHaveBeenCalledExactlyOnceWith(
      { id: USER_ID, selected_organization_id: ORGANIZATION_ID },
      SERVICE_INSTANCE_ID
    );
  });

  it('should allow a member holding any one of the named capabilities', async () => {
    // Given
    vi.spyOn(AuthHelper, 'loadCapabilitiesByServiceId').mockResolvedValue({
      capabilities: ['UPLOAD'],
      is_member: true,
    });
    const guard = serviceGuard<InstanceArgs>({
      serviceInstance: fromInstanceArg,
      capabilities: [
        ServiceRestriction.ManageAccess,
        ServiceRestriction.Upload,
      ],
    });

    // When
    const result = await guard.check(buildMember(), ARGS_WITH_INSTANCE);

    // Then
    expect(result).toMatchObject({ allowed: true });
  });
});
