import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { OwnershipDomain } from './ownership.domain';

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
