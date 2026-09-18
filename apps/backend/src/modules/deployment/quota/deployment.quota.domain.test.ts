import { describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { DeploymentRequestPlatformRegion } from '../../../__generated__/resolvers-types';
import { ErrorCode } from '../../../utils/error/error.code';
import {
  bundleQuotaKey,
  DeploymentQuotaDomain,
} from './deployment.quota.domain';

describe('deploymentQuotaDomain', () => {
  const region = DeploymentRequestPlatformRegion.UsEast;
  const bundleKey = bundleQuotaKey(region);
  const bundleQuotaFilter = { region };
  const unknownRegionKey = bundleQuotaKey(
    'test' as DeploymentRequestPlatformRegion
  );

  describe('reservePlace', () => {
    it('should throw when quota is not found', async () => {
      const call = DeploymentQuotaDomain.reservePlace(unknownRegionKey);

      await expect(call).rejects.toThrow(
        ErrorCode.DeploymentRequestQuotaNotFound
      );
    });

    it.each([0, -1])(
      'should refuse a blocking reservation when availability is %s',
      async (availability) => {
        await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
          availability,
        });

        const result = await DeploymentQuotaDomain.reservePlace(bundleKey);

        const updatedRequestQuota =
          await TestHelper.deploymentRequestQuota.load(bundleQuotaFilter);

        expect(result.isPlaceAvailable).toBe(false);
        expect(updatedRequestQuota!.availability).toBe(availability);
      }
    );

    it('should reserve a place on the bundle quota', async () => {
      await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
        availability: 3,
      });

      const result = await DeploymentQuotaDomain.reservePlace(bundleKey);

      const updatedRequestQuota =
        await TestHelper.deploymentRequestQuota.load(bundleQuotaFilter);

      expect(result.isPlaceAvailable).toBe(true);
      expect(updatedRequestQuota!.availability).toBe(2);
    });

    it('should let a non-blocking reservation drive the bundle quota negative', async () => {
      await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
        availability: 0,
      });

      const result = await DeploymentQuotaDomain.reservePlace(bundleKey, {
        blocking: false,
      });

      const updatedRequestQuota =
        await TestHelper.deploymentRequestQuota.load(bundleQuotaFilter);

      expect(result.isPlaceAvailable).toBe(true);
      expect(updatedRequestQuota!.availability).toBe(-1);
    });
  });

  describe('freePlace', () => {
    it('should throw when quota is not found', async () => {
      const call = DeploymentQuotaDomain.freePlace(unknownRegionKey);

      await expect(call).rejects.toThrow(
        ErrorCode.DeploymentRequestQuotaNotFound
      );
    });

    it('should free a place', async () => {
      await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
        availability: 0,
      });

      await DeploymentQuotaDomain.freePlace(bundleKey);

      const updatedRequestQuota =
        await TestHelper.deploymentRequestQuota.load(bundleQuotaFilter);

      expect(updatedRequestQuota!.availability).toBe(1);
    });

    it('should free a place on the bundle quota, from a negative availability', async () => {
      await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
        availability: -2,
      });

      await DeploymentQuotaDomain.freePlace(bundleKey);

      const updatedRequestQuota =
        await TestHelper.deploymentRequestQuota.load(bundleQuotaFilter);

      expect(updatedRequestQuota!.availability).toBe(-1);
    });
  });

  describe('updateQuotaCapacity', () => {
    it('should throw when quota is not found', async () => {
      const call = DeploymentQuotaDomain.updateQuotaCapacity({
        key: unknownRegionKey,
        newCapacity: 1,
      });

      await expect(call).rejects.toThrow(
        ErrorCode.DeploymentRequestQuotaNotFound
      );
    });

    it.each`
      oldCapacity | oldAvailability | newCapacity | expectedAvailability
      ${5}        | ${2}            | ${2}        | ${-1}
      ${5}        | ${2}            | ${10}       | ${7}
      ${20}       | ${-3}           | ${21}       | ${-2}
    `(
      'should update capacity to $newCapacity and return $expectedAvailability availability',
      async ({
        oldCapacity,
        oldAvailability,
        newCapacity,
        expectedAvailability,
      }) => {
        await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
          capacity: oldCapacity,
          availability: oldAvailability,
        });

        const result = await DeploymentQuotaDomain.updateQuotaCapacity({
          key: bundleKey,
          newCapacity,
        });

        const updatedRequestQuota =
          await TestHelper.deploymentRequestQuota.load(bundleQuotaFilter);

        expect(updatedRequestQuota).toMatchObject({
          capacity: newCapacity,
          availability: expectedAvailability,
        });
        expect(result.newAvailability).toBe(expectedAvailability);
      }
    );
  });
});
