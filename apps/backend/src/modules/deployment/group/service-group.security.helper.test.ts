import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import {
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  DeploymentRequestDeploymentType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { ErrorCode } from '../../../utils/error/error.code';

import { TestHelper } from '../../../../tests/helper/test.helper';
import { ServiceGroupSecurityHelper } from './service-group.security.helper';

describe('serviceGroupSecurityHelper', () => {
  const createdBundleIds: DeploymentRequestId[] = [];

  afterEach(async () => {
    for (const bundleId of createdBundleIds) {
      await TestHelper.deploymentRequest.deleteBundle(bundleId);
    }
    createdBundleIds.length = 0;
  });

  describe('assertOrganizationAccess', () => {
    it('should return the organization id when it matches the user selected organization', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      createdBundleIds.push(bundle.id);

      // When
      const result = await ServiceGroupSecurityHelper.assertOrganizationAccess(
        bundle.service_instance_id
      );

      // Then
      expect(result).toBe(TEST_ORGANIZATIONS.FILIGRAN.ID);
    });

    it('should throw SubscriptionNotFound when the service instance has no subscribed organization', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      createdBundleIds.push(bundle.id);
      await TestHelper.subscription.delete({
        service_instance_id: bundle.service_instance_id,
      });

      // When
      const call = ServiceGroupSecurityHelper.assertOrganizationAccess(
        bundle.service_instance_id
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.SubscriptionNotFound);
    });

    it('should throw OrganizationDoesNotMatchSelectedOrganization for a non-bypass user in another organization', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      createdBundleIds.push(bundle.id);
      requestContext.set(requestContextAdminSecondOrga);

      // When
      const call = ServiceGroupSecurityHelper.assertOrganizationAccess(
        bundle.service_instance_id
      );

      // Then
      await expect(call).rejects.toThrow(
        ErrorCode.OrganizationDoesNotMatchSelectedOrganization
      );
    });

    it('should allow a bypass user even when the organization does not match', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      createdBundleIds.push(bundle.id);
      await TestHelper.subscription.delete({
        service_instance_id: bundle.service_instance_id,
      });
      await TestHelper.subscription.create({
        service_instance_id: bundle.service_instance_id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      requestContext.set(requestContextAdminUser);

      // When
      const result = await ServiceGroupSecurityHelper.assertOrganizationAccess(
        bundle.service_instance_id
      );

      // Then
      expect(result).toBe(TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID);
    });
  });

  describe('assertBundleAccessAndLoad', () => {
    it('should return the bundle deployment request and organization id for a valid bundle', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      createdBundleIds.push(bundle.id);

      // When
      const result = await ServiceGroupSecurityHelper.assertBundleAccessAndLoad(
        bundle.service_instance_id
      );

      // Then
      expect(result.bundleDeploymentRequest.id).toBe(bundle.id);
      expect(result.bundleOrganizationId).toBe(TEST_ORGANIZATIONS.FILIGRAN.ID);
    });

    it('should throw DeploymentRequestNotFound when there is no deployment request for the service instance', async () => {
      // Given
      const bundleServiceInstanceId = uuidv4() as ServiceInstanceId;

      // When
      const call = ServiceGroupSecurityHelper.assertBundleAccessAndLoad(
        bundleServiceInstanceId
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });

    it('should throw SubscriptionNotFound when the bundle has no subscribed organization', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      createdBundleIds.push(bundle.id);
      await TestHelper.subscription.delete({
        service_instance_id: bundle.service_instance_id,
      });

      // When
      const call = ServiceGroupSecurityHelper.assertBundleAccessAndLoad(
        bundle.service_instance_id
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.SubscriptionNotFound);
    });

    it('should prevent a non-bypass user from accessing a bundle of another organization', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      createdBundleIds.push(bundle.id);
      requestContext.set(requestContextAdminSecondOrga);

      // When
      const call = ServiceGroupSecurityHelper.assertBundleAccessAndLoad(
        bundle.service_instance_id
      );

      // Then
      await expect(call).rejects.toThrow(
        ErrorCode.OrganizationDoesNotMatchSelectedOrganization
      );
    });

    it('should allow a bypass user to access a bundle of another organization', async () => {
      // Given
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
          }
        );
      createdBundleIds.push(bundle.id);
      await TestHelper.subscription.delete({
        service_instance_id: bundle.service_instance_id,
      });
      await TestHelper.subscription.create({
        service_instance_id: bundle.service_instance_id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      requestContext.set(requestContextAdminUser);

      // When
      const result = await ServiceGroupSecurityHelper.assertBundleAccessAndLoad(
        bundle.service_instance_id
      );

      // Then
      expect(result.bundleDeploymentRequest.id).toBe(bundle.id);
      expect(result.bundleOrganizationId).toBe(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
    });
  });

  describe('assertBundleAccessAndLoadChildren', () => {
    it('should return the bundle deployment request, organization id and its children', async () => {
      // Given
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [
            { platform_identifier: PlatformIdentifier.Opencti },
            { platform_identifier: PlatformIdentifier.Openaev },
          ],
        });
      createdBundleIds.push(bundle.id);

      // When
      const result =
        await ServiceGroupSecurityHelper.assertBundleAccessAndLoadChildren(
          bundle.service_instance_id
        );

      // Then
      expect(result.bundleDeploymentRequest.id).toBe(bundle.id);
      expect(result.bundleOrganizationId).toBe(TEST_ORGANIZATIONS.FILIGRAN.ID);
      expect(result.children.map((child) => child.id)).toEqual(
        expect.arrayContaining(children.map((child) => child.id))
      );
    });

    it('should throw DeploymentRequestNotFound when the bundle has no deployment request', async () => {
      // Given
      const bundleServiceInstanceId = uuidv4() as ServiceInstanceId;

      // When
      const call = ServiceGroupSecurityHelper.assertBundleAccessAndLoadChildren(
        bundleServiceInstanceId
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });
  });

  describe('assertUsersBelongToOrganization', () => {
    it('should not throw when userIds is empty', async () => {
      // When
      const call = ServiceGroupSecurityHelper.assertUsersBelongToOrganization(
        [],
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      // Then
      await expect(call).resolves.not.toThrow();
    });

    it('should not throw when all users belong to the organization', async () => {
      // When
      const call = ServiceGroupSecurityHelper.assertUsersBelongToOrganization(
        [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      // Then
      await expect(call).resolves.not.toThrow();
    });

    it('should throw UserIsNotInOrganization when a user does not belong to the organization', async () => {
      // When
      const call = ServiceGroupSecurityHelper.assertUsersBelongToOrganization(
        [
          TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        ],
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should not throw for a bypass user even when users do not belong to the organization', async () => {
      // Given
      requestContext.set(requestContextAdminUser);

      // When
      const call = ServiceGroupSecurityHelper.assertUsersBelongToOrganization(
        [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID],
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      // Then
      await expect(call).resolves.not.toThrow();
    });
  });
});
