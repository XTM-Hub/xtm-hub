import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextAdminSecondOrga,
  TEST_ORGANIZATIONS,
  TEST_SUBSCRIPTIONS,
} from '../../../tests/tests.const';
import { requestContext } from '../../context/request.context';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import * as mailService from '../../server/mail-service';
import { ErrorCode } from '../../utils/error/error.code';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { UserServiceApp } from './user-service.app';

describe('user service app', () => {
  describe('addUserService', () => {
    it('should throw SubscriptionNotFound when the subscription is not in the selected organization', async () => {
      // Given
      requestContext.set(requestContextAdminSecondOrga);
      const filigranSubscription = TEST_SUBSCRIPTIONS.FILIGRAN_COMMUNITY;

      // When
      const call = UserServiceApp.addUserService(
        requestContextAdminSecondOrga.user,
        filigranSubscription.ID,
        [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL],
        [],
        filigranSubscription.SERVICE_INSTANCE_ID
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.SubscriptionNotFound);
    });

    it('should add the user service when the subscription is in the selected organization', async () => {
      // Given
      vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);
      requestContext.set(requestContextAdminSecondOrga);
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      const secondOrganizationSubscriptionId = uuidv4() as SubscriptionId;
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'user-service-app-test-instance',
      });
      await SubscriptionDomain.createSubscription({
        id: secondOrganizationSubscriptionId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstanceId,
        start_date: new Date(),
        end_date: null,
      });

      // When
      const result = await UserServiceApp.addUserService(
        requestContextAdminSecondOrga.user,
        secondOrganizationSubscriptionId,
        [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.EMAIL],
        [],
        serviceInstanceId
      );

      // Then
      expect(result).toMatchObject([
        {
          subscription_id: secondOrganizationSubscriptionId,
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        },
      ]);
    });
  });
});
