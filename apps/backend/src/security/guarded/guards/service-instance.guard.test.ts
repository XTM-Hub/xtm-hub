import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import { PortalCapability } from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { ServiceInstanceDomain } from '../../../modules/service/instance/service-instance.domain';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { buildPrincipal } from '../principal';
import { fromArg } from '../sources';
import { anyOf } from './combinators';
import {
  publicServiceInstance,
  subscribedGuard,
} from './service-instance.guard';

const { ANONYMOUS, buildSystemPrincipal, buildUserPrincipal } =
  TestHelper.guardFixtures;

const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN.ID;
const SECOND_ORGANIZATION = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;

type InstanceArgs = { instanceId: ServiceInstanceId };
const fromInstanceArg = fromArg<InstanceArgs, 'instanceId'>('instanceId');

const buildFiligranMember = () =>
  buildUserPrincipal({
    selectedOrganizationId: FILIGRAN,
    memberships: { [FILIGRAN]: [] },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await TestHelper.serviceInstanceScene.cleanupAll();
});

describe('publicServiceInstance', () => {
  const buildGuard = () =>
    publicServiceInstance<InstanceArgs>({ serviceInstance: fromInstanceArg });

  let publicInstanceId: ServiceInstanceId;
  let hiddenInstanceId: ServiceInstanceId;

  beforeAll(async () => {
    publicInstanceId = (
      await TestHelper.serviceInstanceScene.create({ isPublic: true })
    ).serviceInstance.id;
    hiddenInstanceId = (
      await TestHelper.serviceInstanceScene.create({
        isPublic: false,
        subscribedBy: [FILIGRAN],
      })
    ).serviceInstance.id;
  });

  it.each([
    { label: 'an anonymous visitor', principal: ANONYMOUS },
    { label: 'a member of an organization', principal: buildFiligranMember() },
  ])(
    'should allow $label on a public service instance',
    async ({ principal }) => {
      // When
      const result = await buildGuard().check(principal, {
        instanceId: publicInstanceId,
      });

      // Then
      expect(result).toEqual({ allowed: true });
    }
  );

  it.each([
    { label: 'an anonymous visitor', principal: ANONYMOUS },
    {
      label: 'a member of the organization that subscribes to it',
      principal: buildFiligranMember(),
    },
  ])(
    'should refuse $label with NOT_FOUND on a non public service instance',
    async ({ principal }) => {
      // When
      const result = await buildGuard().check(principal, {
        instanceId: hiddenInstanceId,
      });

      // Then
      expect(result).toEqual({
        allowed: false,
        code: NotFoundErrorCode.NotFound,
      });
    }
  );

  it('should refuse with NOT_FOUND an unknown service instance', async () => {
    // When
    const result = await buildGuard().check(ANONYMOUS, {
      instanceId: uuidv4() as ServiceInstanceId,
    });

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
  });

  it.each([
    { label: 'a malformed id', args: { instanceId: 'not-a-uuid' } },
    { label: 'no id', args: {} },
  ])(
    'should refuse $label with NOT_FOUND without querying',
    async ({ args }) => {
      // Given
      const isPublic = vi.spyOn(
        ServiceInstanceDomain,
        'isServiceInstancePublic'
      );

      // When
      const result = await buildGuard().check(ANONYMOUS, args as InstanceArgs);

      // Then
      expect(result).toEqual({
        allowed: false,
        code: NotFoundErrorCode.NotFound,
      });
      expect(isPublic).not.toHaveBeenCalled();
    }
  );

  it('should build the principal of the other user guards, so that it combines with them', async () => {
    // Given
    const guard = buildGuard();

    // Then
    expect(guard.principalFrom).toBe(buildPrincipal);
    expect(() =>
      anyOf(guard, subscribedGuard({ serviceInstance: fromInstanceArg }))
    ).not.toThrow();
  });
});

describe('subscribedGuard', () => {
  const buildGuard = () =>
    subscribedGuard<InstanceArgs>({ serviceInstance: fromInstanceArg });

  let subscribedHiddenInstanceId: ServiceInstanceId;
  let subscribedPublicInstanceId: ServiceInstanceId;
  let notSubscribedPublicInstanceId: ServiceInstanceId;
  let subscribedBySecondOrganizationId: ServiceInstanceId;

  beforeAll(async () => {
    subscribedHiddenInstanceId = (
      await TestHelper.serviceInstanceScene.create({
        isPublic: false,
        subscribedBy: [FILIGRAN],
      })
    ).serviceInstance.id;
    subscribedPublicInstanceId = (
      await TestHelper.serviceInstanceScene.create({
        isPublic: true,
        subscribedBy: [FILIGRAN],
      })
    ).serviceInstance.id;
    notSubscribedPublicInstanceId = (
      await TestHelper.serviceInstanceScene.create({ isPublic: true })
    ).serviceInstance.id;
    subscribedBySecondOrganizationId = (
      await TestHelper.serviceInstanceScene.create({
        isPublic: false,
        subscribedBy: [SECOND_ORGANIZATION],
      })
    ).serviceInstance.id;
  });

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
  ])(
    'should answer $label without any lookup',
    async ({ principal, expected }) => {
      // Given
      const isSubscribed = vi.spyOn(
        ServiceInstanceDomain,
        'isServiceInstanceSubscribedByOrganization'
      );

      // When
      const result = await buildGuard().check(principal, {
        instanceId: subscribedHiddenInstanceId,
      });

      // Then
      expect(result).toEqual(expected);
      expect(isSubscribed).not.toHaveBeenCalled();
    }
  );

  it('should allow a BYPASS user as an admin without reading the service instance nor querying', async () => {
    // Given
    const isSubscribed = vi.spyOn(
      ServiceInstanceDomain,
      'isServiceInstanceSubscribedByOrganization'
    );
    const serviceInstance = vi.fn(fromInstanceArg);
    const guard = subscribedGuard<InstanceArgs>({ serviceInstance });

    // When
    const result = await guard.check(
      buildUserPrincipal({ isBypassUser: true }),
      { instanceId: notSubscribedPublicInstanceId }
    );

    // Then
    expect(result).toEqual({ allowed: true, checked: { kind: 'admin' } });
    expect(serviceInstance).not.toHaveBeenCalled();
    expect(isSubscribed).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'a non public', instanceId: () => subscribedHiddenInstanceId },
    { label: 'a public', instanceId: () => subscribedPublicInstanceId },
  ])(
    'should allow a member of the subscribed organization on $label service instance, with no capability',
    async ({ instanceId }) => {
      // When
      const result = await buildGuard().check(buildFiligranMember(), {
        instanceId: instanceId(),
      });

      // Then
      expect(result).toEqual({
        allowed: true,
        checked: {
          kind: 'serviceInstance',
          serviceInstanceId: instanceId(),
          organizationId: FILIGRAN,
        },
      });
    }
  );

  it.each([
    {
      label: 'a service instance another organization subscribes to',
      instanceId: () => subscribedBySecondOrganizationId,
    },
    {
      label: 'a public service instance nobody subscribes to',
      instanceId: () => notSubscribedPublicInstanceId,
    },
    {
      label: 'an unknown service instance',
      instanceId: () => uuidv4() as ServiceInstanceId,
    },
  ])(
    'should refuse a member of the selected organization with NOT_FOUND on $label',
    async ({ instanceId }) => {
      // When
      const result = await buildGuard().check(buildFiligranMember(), {
        instanceId: instanceId(),
      });

      // Then
      expect(result).toEqual({
        allowed: false,
        code: NotFoundErrorCode.NotFound,
      });
    }
  );

  it('should refuse with NOT_FOUND, without reading the service instance nor querying, a user who is not a member of the selected organization', async () => {
    // Given
    const isSubscribed = vi.spyOn(
      ServiceInstanceDomain,
      'isServiceInstanceSubscribedByOrganization'
    );
    const serviceInstance = vi.fn(fromInstanceArg);
    const guard = subscribedGuard<InstanceArgs>({ serviceInstance });
    const nonMember = buildUserPrincipal({
      selectedOrganizationId: SECOND_ORGANIZATION,
      memberships: { [FILIGRAN]: [] },
    });

    // When
    const result = await guard.check(nonMember, {
      instanceId: subscribedBySecondOrganizationId,
    });

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
    expect(serviceInstance).not.toHaveBeenCalled();
    expect(isSubscribed).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'a malformed id', args: { instanceId: 'not-a-uuid' } },
    { label: 'no id', args: {} },
  ])(
    'should refuse $label with NOT_FOUND without querying',
    async ({ args }) => {
      // Given
      const isSubscribed = vi.spyOn(
        ServiceInstanceDomain,
        'isServiceInstanceSubscribedByOrganization'
      );

      // When
      const result = await buildGuard().check(
        buildFiligranMember(),
        args as InstanceArgs
      );

      // Then
      expect(result).toEqual({
        allowed: false,
        code: NotFoundErrorCode.NotFound,
      });
      expect(isSubscribed).not.toHaveBeenCalled();
    }
  );
});

describe('publicServiceInstance and subscribedGuard in anyOf', () => {
  const buildGuard = () =>
    anyOf(
      publicServiceInstance<InstanceArgs>({ serviceInstance: fromInstanceArg }),
      subscribedGuard<InstanceArgs>({ serviceInstance: fromInstanceArg })
    );

  let publicInstanceId: ServiceInstanceId;
  let subscribedHiddenInstanceId: ServiceInstanceId;

  beforeAll(async () => {
    publicInstanceId = (
      await TestHelper.serviceInstanceScene.create({ isPublic: true })
    ).serviceInstance.id;
    subscribedHiddenInstanceId = (
      await TestHelper.serviceInstanceScene.create({
        isPublic: false,
        subscribedBy: [FILIGRAN],
      })
    ).serviceInstance.id;
  });

  it('should allow an anonymous visitor on a public service instance', async () => {
    // When
    const result = await buildGuard().check(ANONYMOUS, {
      instanceId: publicInstanceId,
    });

    // Then
    expect(result).toEqual({ allowed: true });
  });

  it('should refuse an anonymous visitor with UNAUTHENTICATED on a non public service instance', async () => {
    // When
    const result = await buildGuard().check(ANONYMOUS, {
      instanceId: subscribedHiddenInstanceId,
    });

    // Then
    expect(result).toEqual({
      allowed: false,
      code: UnauthenticatedErrorCode.Unauthenticated,
    });
  });

  it('should allow a subscriber on a non public service instance, handing what it checked', async () => {
    // When
    const result = await buildGuard().check(buildFiligranMember(), {
      instanceId: subscribedHiddenInstanceId,
    });

    // Then
    expect(result).toEqual({
      allowed: true,
      checked: {
        kind: 'serviceInstance',
        serviceInstanceId: subscribedHiddenInstanceId,
        organizationId: FILIGRAN,
      },
    });
  });
});
