import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { belongTo, OwnershipDomain } from './ownership';
import { fromArg } from './sources';

const { buildUserPrincipal, ORGANIZATION_ID } = TestHelper.guardFixtures;

const SERVICE_INSTANCE_ID =
  '11111111-1111-4111-8111-111111111111' as ServiceInstanceId;

const ROW_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROW_B = '33333333-3333-4333-8333-333333333333';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('belongTo', () => {
  type TargetArgs = { ids: string[]; instanceId: ServiceInstanceId };
  const ORGANIZATION_CHECKED = {
    kind: 'organization',
    organizationId: ORGANIZATION_ID,
  } as const;
  const INSTANCE_CHECKED = {
    kind: 'serviceInstance',
    serviceInstanceId: SERVICE_INSTANCE_ID,
    organizationId: ORGANIZATION_ID,
  } as const;
  const ownedRows = () =>
    belongTo<Pick<TargetArgs, 'ids'>>('User_Service', ({ ids }) => ids);
  const ownedRowsOnInstance = () =>
    belongTo<TargetArgs>('User_Service', ({ ids }) => ids, {
      serviceInstance: fromArg('instanceId'),
    });
  const givenCount = (count: number) =>
    vi.spyOn(OwnershipDomain, 'countOwnedRows').mockResolvedValue(count);

  it('should count each id once and allow when every one is found', async () => {
    // Given
    const count = givenCount(2);

    // When
    const result = await ownedRows()(
      buildUserPrincipal(),
      { ids: [ROW_A, ROW_B, ROW_A] },
      ORGANIZATION_CHECKED
    );

    // Then
    expect(result).toEqual({ allowed: true });
    expect(count).toHaveBeenCalledExactlyOnceWith(
      'User_Service',
      [ROW_A, ROW_B],
      {
        organizationId: ORGANIZATION_ID,
        serviceInstanceId: undefined,
      }
    );
  });

  it('should count the same id in two cases as one id', async () => {
    // Given
    const count = givenCount(1);

    // When
    const result = await ownedRows()(
      buildUserPrincipal(),
      { ids: [ROW_A.toUpperCase(), ROW_A] },
      ORGANIZATION_CHECKED
    );

    // Then
    expect(result).toEqual({ allowed: true });
    expect(count).toHaveBeenCalledExactlyOnceWith('User_Service', [ROW_A], {
      organizationId: ORGANIZATION_ID,
      serviceInstanceId: undefined,
    });
  });

  it('should allow an empty list without a query, even when nothing was checked', async () => {
    // Given
    const count = givenCount(0);

    // When
    const result = await ownedRows()(
      buildUserPrincipal(),
      { ids: [] },
      undefined
    );

    // Then
    expect(result).toEqual({ allowed: true });
    expect(count).not.toHaveBeenCalled();
  });

  it('should refuse with FORBIDDEN_ACCESS without a query when the guard checked nothing', async () => {
    // Given
    const count = givenCount(1);

    // When
    const result = await ownedRows()(
      buildUserPrincipal(),
      { ids: [ROW_A] },
      undefined
    );

    // Then
    expect(result).toEqual({
      allowed: false,
      code: ForbiddenErrorCode.ForbiddenAccess,
    });
    expect(count).not.toHaveBeenCalled();
  });

  it('should refuse the whole request with NOT_FOUND when one id is missing or foreign', async () => {
    // Given
    givenCount(1);

    // When
    const result = await ownedRows()(
      buildUserPrincipal(),
      { ids: [ROW_A, ROW_B] },
      ORGANIZATION_CHECKED
    );

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
  });

  it.each([
    {
      label: 'any row for an admin',
      checked: { kind: 'admin' } as const,
      expected: { organizationId: undefined, serviceInstanceId: undefined },
    },
    {
      label: 'the organization for an organization guard',
      checked: ORGANIZATION_CHECKED,
      expected: {
        organizationId: ORGANIZATION_ID,
        serviceInstanceId: undefined,
      },
    },
    {
      label: 'the service instance and the organization for a service guard',
      checked: INSTANCE_CHECKED,
      expected: {
        organizationId: ORGANIZATION_ID,
        serviceInstanceId: SERVICE_INSTANCE_ID,
      },
    },
  ])('should scope the query to $label', async ({ checked, expected }) => {
    // Given
    const count = givenCount(1);

    // When
    await ownedRows()(buildUserPrincipal(), { ids: [ROW_A] }, checked);

    // Then
    expect(count).toHaveBeenCalledExactlyOnceWith(
      'User_Service',
      [ROW_A],
      expected
    );
  });

  it.each([
    { label: 'an admin', checked: { kind: 'admin' } as const },
    { label: 'an organization guard', checked: ORGANIZATION_CHECKED },
    { label: 'a service guard', checked: INSTANCE_CHECKED },
  ])(
    'should also require the service instance of the option for $label',
    async ({ checked }) => {
      // Given
      const count = givenCount(1);

      // When
      const result = await ownedRowsOnInstance()(
        buildUserPrincipal(),
        { ids: [ROW_A], instanceId: SERVICE_INSTANCE_ID },
        checked
      );

      // Then
      expect(result).toEqual({ allowed: true });
      expect(count).toHaveBeenCalledExactlyOnceWith(
        'User_Service',
        [ROW_A],
        expect.objectContaining({ serviceInstanceId: SERVICE_INSTANCE_ID })
      );
    }
  );

  it('should refuse with NOT_FOUND without a query when the option gives no service instance', async () => {
    // Given
    const count = givenCount(1);

    // When
    const result = await ownedRowsOnInstance()(
      buildUserPrincipal(),
      { ids: [ROW_A] } as TargetArgs,
      ORGANIZATION_CHECKED
    );

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
    expect(count).not.toHaveBeenCalled();
  });

  it('should refuse with NOT_FOUND without a query when the service instance of the option is not the one the guard checked', async () => {
    // Given
    const count = givenCount(1);

    // When
    const result = await ownedRowsOnInstance()(
      buildUserPrincipal(),
      {
        ids: [ROW_A],
        instanceId: '44444444-4444-4444-8444-444444444444' as ServiceInstanceId,
      },
      INSTANCE_CHECKED
    );

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
    expect(count).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'an id that is not a uuid', ids: [ROW_A, 'not-a-uuid'] },
    { label: 'an empty id', ids: [''] },
  ])(
    'should refuse the whole request with NOT_FOUND, without a query, for $label',
    async ({ ids }) => {
      // Given
      const count = givenCount(1);

      // When
      const result = await ownedRows()(
        buildUserPrincipal(),
        { ids },
        ORGANIZATION_CHECKED
      );

      // Then
      expect(result).toEqual({
        allowed: false,
        code: NotFoundErrorCode.NotFound,
      });
      expect(count).not.toHaveBeenCalled();
    }
  );

  it('should refuse with NOT_FOUND, without a query, a service instance of the option that is not a uuid', async () => {
    // Given
    const count = givenCount(1);

    // When
    const result = await ownedRowsOnInstance()(
      buildUserPrincipal(),
      { ids: [ROW_A], instanceId: 'not-a-uuid' as ServiceInstanceId },
      ORGANIZATION_CHECKED
    );

    // Then
    expect(result).toEqual({
      allowed: false,
      code: NotFoundErrorCode.NotFound,
    });
    expect(count).not.toHaveBeenCalled();
  });

  it('should throw at construction for a table without an ownership mapping', () => {
    // When
    const build = () => belongTo('Epic', () => []);

    // Then
    expect(build).toThrow('No ownership is mapped for the table Epic');
  });
});

describe('ownershipDomain.countOwnedRows', () => {
  const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN.ID;
  const SECOND_ORGANIZATION = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;

  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) {
      await cleanup();
    }
  });

  const givenScene = async () => {
    const scene = await TestHelper.userServiceScene.create();
    cleanups.push(scene.cleanup);
    return scene;
  };

  describe('on the User_Service table', () => {
    it('should count the rows of the organization on the service instance', async () => {
      // Given
      const { serviceInstance, target } = await givenScene();

      // When
      const count = await OwnershipDomain.countOwnedRows(
        'User_Service',
        [target.id],
        { organizationId: FILIGRAN, serviceInstanceId: serviceInstance.id }
      );

      // Then
      expect(count).toBe(1);
    });

    it('should not count a row of another organization', async () => {
      // Given
      const { serviceInstance, target } = await givenScene();

      // When
      const count = await OwnershipDomain.countOwnedRows(
        'User_Service',
        [target.id],
        {
          organizationId: SECOND_ORGANIZATION,
          serviceInstanceId: serviceInstance.id,
        }
      );

      // Then
      expect(count).toBe(0);
    });

    it('should not count a row of another service instance', async () => {
      // Given
      const { target } = await givenScene();

      // When
      const count = await OwnershipDomain.countOwnedRows(
        'User_Service',
        [target.id],
        {
          organizationId: FILIGRAN,
          serviceInstanceId: uuidv4() as ServiceInstanceId,
        }
      );

      // Then
      expect(count).toBe(0);
    });

    it('should count the rows of any organization and service instance when no scope is given', async () => {
      // Given
      const { target } = await givenScene();

      // When
      const count = await OwnershipDomain.countOwnedRows(
        'User_Service',
        [target.id],
        {}
      );

      // Then
      expect(count).toBe(1);
    });

    it('should count each row once and ignore an unknown id', async () => {
      // Given
      const { target } = await givenScene();

      // When
      const count = await OwnershipDomain.countOwnedRows(
        'User_Service',
        [target.id, target.id, uuidv4()],
        { organizationId: FILIGRAN }
      );

      // Then
      expect(count).toBe(1);
    });
  });

  describe('on the Subscription table', () => {
    it('should count the subscription of the organization on the service instance', async () => {
      // Given
      const { serviceInstance, subscription } = await givenScene();

      // When
      const count = await OwnershipDomain.countOwnedRows(
        'Subscription',
        [subscription.id],
        { organizationId: FILIGRAN, serviceInstanceId: serviceInstance.id }
      );

      // Then
      expect(count).toBe(1);
    });

    it('should not count the subscription of another organization', async () => {
      // Given
      const { subscription } = await givenScene();

      // When
      const count = await OwnershipDomain.countOwnedRows(
        'Subscription',
        [subscription.id],
        { organizationId: SECOND_ORGANIZATION }
      );

      // Then
      expect(count).toBe(0);
    });
  });

  it('should throw for a table with no ownership mapped', async () => {
    // When
    const call = OwnershipDomain.countOwnedRows('Epic', [uuidv4()], {});

    // Then
    await expect(call).rejects.toThrow('No ownership is mapped');
  });
});
