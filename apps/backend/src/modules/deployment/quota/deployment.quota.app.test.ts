import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformRegion,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import DeploymentRequest, {
  DeploymentRequestId,
} from '../../../model/kanel/public/DeploymentRequest';
import { DeploymentQuotaApp } from './deployment.quota.app';

describe('deploymentQuotaApp', () => {
  const region = DeploymentRequestPlatformRegion.EuWest;
  const bundleFilter = { region };

  const setQuota = async ({
    capacity = 10,
    availability,
  }: {
    capacity?: number;
    availability: number;
  }) => {
    await TestHelper.deploymentRequestQuota.update(bundleFilter, {
      capacity,
      availability,
    });
  };

  const loadAvailability = async (): Promise<number> => {
    const quota = await TestHelper.deploymentRequestQuota.load(bundleFilter);
    return quota!.availability;
  };

  const createRequest = async (
    data: Partial<DeploymentRequest>
  ): Promise<DeploymentRequest> =>
    TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription({
      region,
      ...data,
    });

  const createBundle = async (
    hubStatus: DeploymentRequestHubStatus,
    products: PlatformIdentifier[]
  ): Promise<DeploymentRequest> => {
    const bundle = await createRequest({
      type: DeploymentRequestDeploymentType.Bundle,
      platform_identifier: null,
      hub_status: hubStatus,
    });

    for (const platformIdentifier of products) {
      await createRequest({
        platform_identifier: platformIdentifier,
        hub_status: hubStatus,
        parent_id: bundle.id,
      });
    }

    return bundle;
  };

  beforeEach(async () => {
    await TestHelper.deploymentRequest.delete({});
    await setQuota({ availability: 5 });
  });

  describe('releaseQuotaForRequest', () => {
    it('should give the bundle place back when no bundle is queued', async () => {
      const bundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Cancelled,
      });

      const promoted = await DeploymentQuotaApp.releaseQuotaForRequest(
        bundle,
        DeploymentRequestHubStatus.Active
      );

      expect(promoted).toBeUndefined();
      expect(await loadAvailability()).toBe(6);
    });

    it('should promote a queued bundle and take its place', async () => {
      const queuedBundle = await createBundle(
        DeploymentRequestHubStatus.Queued,
        [PlatformIdentifier.Opencti]
      );
      const bundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Cancelled,
      });

      const promoted = await DeploymentQuotaApp.releaseQuotaForRequest(
        bundle,
        DeploymentRequestHubStatus.Active
      );

      expect(promoted?.id).toBe(queuedBundle.id);
      expect(await loadAvailability()).toBe(5);
    });

    it('should give no place back and promote no one when a bundle child is released', async () => {
      const bundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Active,
      });
      const child = await createRequest({
        platform_identifier: PlatformIdentifier.Opencti,
        hub_status: DeploymentRequestHubStatus.Cancelled,
        parent_id: bundle.id,
      });
      const queuedBundle = await createBundle(
        DeploymentRequestHubStatus.Queued,
        []
      );

      const promoted = await DeploymentQuotaApp.releaseQuotaForRequest(
        child,
        DeploymentRequestHubStatus.Active
      );

      expect(promoted).toBeUndefined();
      await TestHelper.deploymentRequest.assertProperties(
        queuedBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Queued }
      );
      expect(await loadAvailability()).toBe(5);
    });

    it('should give the bundle place back when a standalone trial is released', async () => {
      const trial = await createRequest({
        platform_identifier: PlatformIdentifier.Opencti,
        hub_status: DeploymentRequestHubStatus.Cancelled,
      });

      const promoted = await DeploymentQuotaApp.releaseQuotaForRequest(
        trial,
        DeploymentRequestHubStatus.Active
      );

      expect(promoted).toBeUndefined();
      expect(await loadAvailability()).toBe(6);
    });

    it('should give the place back without promoting anyone when promotion is disabled', async () => {
      const queuedBundle = await createBundle(
        DeploymentRequestHubStatus.Queued,
        []
      );
      const bundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Queued,
      });

      const promoted = await DeploymentQuotaApp.releaseQuotaForRequest(
        bundle,
        DeploymentRequestHubStatus.Pending,
        { promote: false }
      );

      expect(promoted).toBeUndefined();
      expect(await loadAvailability()).toBe(6);
      await TestHelper.deploymentRequest.assertProperties(
        queuedBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Queued }
      );
    });
  });

  describe('applyQuotaCapacityChange', () => {
    const applyBundleCapacity = async (newCapacity: number) => {
      const onRequestMoved = vi.fn().mockResolvedValue(undefined);

      await DeploymentQuotaApp.applyQuotaCapacityChange({
        region,
        newCapacity,
        onRequestMoved,
      });

      return onRequestMoved;
    };

    it('should promote a queued bundle along with its children and take its place', async () => {
      // Given
      await setQuota({ capacity: 5, availability: 0 });
      const queuedBundle = await createBundle(
        DeploymentRequestHubStatus.Queued,
        [PlatformIdentifier.Opencti]
      );

      // When
      const onRequestMoved = await applyBundleCapacity(6);

      // Then
      await TestHelper.deploymentRequest.assertProperties(
        queuedBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Pending }
      );
      const children = await TestHelper.deploymentRequest.loadMany({
        parent_id: queuedBundle.id,
      });
      expect(children).toHaveLength(1);
      expect(children[0]).toMatchObject({
        hub_status: DeploymentRequestHubStatus.Pending,
      });
      expect(await loadAvailability()).toBe(0);
      expect(onRequestMoved).toHaveBeenCalledTimes(1);
      expect(onRequestMoved.mock.calls[0][0].id).toBe(queuedBundle.id);
    });

    it('should promote only as many bundles as the raised capacity allows', async () => {
      // Given
      await setQuota({ capacity: 5, availability: 0 });
      const firstQueuedBundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Queued,
        ordering: 1,
      });
      const secondQueuedBundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Queued,
        ordering: 2,
      });

      // When
      const onRequestMoved = await applyBundleCapacity(6);

      // Then
      await TestHelper.deploymentRequest.assertProperties(
        firstQueuedBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Pending }
      );
      await TestHelper.deploymentRequest.assertProperties(
        secondQueuedBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Queued }
      );
      expect(onRequestMoved).toHaveBeenCalledTimes(1);
    });

    it('should not promote a queued standalone trial when the capacity is raised', async () => {
      // Given
      await setQuota({ capacity: 5, availability: 0 });
      const queuedTrial = await createRequest({
        platform_identifier: PlatformIdentifier.Opencti,
        hub_status: DeploymentRequestHubStatus.Queued,
      });

      // When
      const onRequestMoved = await applyBundleCapacity(6);

      // Then
      await TestHelper.deploymentRequest.assertProperties(
        queuedTrial.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Queued }
      );
      expect(await loadAvailability()).toBe(1);
      expect(onRequestMoved).not.toHaveBeenCalled();
    });

    it('should queue the last pending bundle and give its place back when the capacity is lowered', async () => {
      // Given
      await setQuota({ capacity: 1, availability: 0 });
      const pendingBundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Pending,
      });
      const child = await createRequest({
        platform_identifier: PlatformIdentifier.Opencti,
        hub_status: DeploymentRequestHubStatus.Pending,
        parent_id: pendingBundle.id,
      });

      // When
      const onRequestMoved = await applyBundleCapacity(0);

      // Then
      await TestHelper.deploymentRequest.assertProperties(
        pendingBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Queued }
      );
      await TestHelper.deploymentRequest.assertProperties(
        child.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Queued }
      );
      expect(await loadAvailability()).toBe(0);
      expect(onRequestMoved).toHaveBeenCalledTimes(1);
    });

    it('should queue only as many bundles as the lowered capacity requires', async () => {
      // Given
      await setQuota({ capacity: 2, availability: 0 });
      const firstPendingBundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Pending,
        ordering: 1,
      });
      const secondPendingBundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Pending,
        ordering: 2,
      });

      // When
      const onRequestMoved = await applyBundleCapacity(1);

      // Then
      await TestHelper.deploymentRequest.assertProperties(
        secondPendingBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Queued }
      );
      await TestHelper.deploymentRequest.assertProperties(
        firstPendingBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Pending }
      );
      expect(onRequestMoved).toHaveBeenCalledTimes(1);
    });

    it('should stop without failing when there are less pending bundles than the capacity drop', async () => {
      // Given
      await setQuota({ capacity: 3, availability: 0 });
      const pendingBundle = await createRequest({
        type: DeploymentRequestDeploymentType.Bundle,
        platform_identifier: null,
        hub_status: DeploymentRequestHubStatus.Pending,
      });

      // When
      const onRequestMoved = await applyBundleCapacity(0);

      // Then
      await TestHelper.deploymentRequest.assertProperties(
        pendingBundle.id as DeploymentRequestId,
        { hub_status: DeploymentRequestHubStatus.Queued }
      );
      expect(onRequestMoved).toHaveBeenCalledTimes(1);
    });
  });
});
