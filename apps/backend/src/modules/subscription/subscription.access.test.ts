import { toGlobalId } from 'graphql-relay/node/node.js';
import { describe, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  TEST_ORGANIZATIONS,
  TEST_SUBSCRIPTIONS,
} from '../../../tests/tests.const';
import {
  OrderingMode,
  SubscriptionFilterKey,
  SubscriptionOrdering,
} from '../../__generated__/resolvers-types';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { subscriptionApp } from './subscription.app';
import { SubscriptionDomain } from './subscription.domain';

const FIXTURE = TEST_SUBSCRIPTIONS.FILIGRAN_COMMUNITY;

const ORGANIZATION_MEMBERS = {
  anonymous: UnauthenticatedErrorCode.Unauthenticated,
  user: 'allowed',
  memberWithoutCapability: 'allowed',
  otherOrganization: 'allowed',
  nonMember: NotFoundErrorCode.NotFound,
  admin: 'allowed',
} as const;

const ADMIN_ONLY = {
  anonymous: UnauthenticatedErrorCode.Unauthenticated,
  user: ForbiddenErrorCode.ForbiddenAccess,
  memberWithoutCapability: ForbiddenErrorCode.ForbiddenAccess,
  otherOrganization: ForbiddenErrorCode.ForbiddenAccess,
  nonMember: ForbiddenErrorCode.ForbiddenAccess,
  admin: 'allowed',
} as const;

const noCleanup = () => Promise.resolve();

describe('subscriptions query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query ($filters: [SubscriptionFilter!]) {
      subscriptions(
        first: 10
        orderBy: ${SubscriptionOrdering.StartDate}
        orderMode: ${OrderingMode.Asc}
        filters: $filters
      ) {
        totalCount
      }
    }`,
    guarded: () => vi.spyOn(subscriptionApp, 'loadSubscriptions'),
    expected: ORGANIZATION_MEMBERS,
    prepare: () =>
      Promise.resolve({
        variables: {
          filters: [
            {
              key: SubscriptionFilterKey.ServiceInstanceId,
              value: [
                toGlobalId('ServiceInstance', FIXTURE.SERVICE_INSTANCE_ID),
              ],
            },
          ],
        },
        expectedData: {
          subscriptions: { totalCount: 1 },
        },
        expectedDataByRow: {
          otherOrganization: { subscriptions: { totalCount: 0 } },
        },
        cleanup: noCleanup,
      }),
  });
});

describe('subscriptionById query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query ($subscriptionId: SubscriptionId) {
      subscriptionById(subscription_id: $subscriptionId) { __typename }
    }`,
    guarded: () =>
      vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionWithOrganizationAndCapabilitiesBy'
      ),
    expected: ORGANIZATION_MEMBERS,
    prepare: () =>
      Promise.resolve({
        variables: { subscriptionId: FIXTURE.ID },
        expectedData: { subscriptionById: { __typename: 'SubscriptionModel' } },
        expectedDataByRow: { otherOrganization: { subscriptionById: null } },
        cleanup: noCleanup,
      }),
  });
});

describe('createSubscriptions mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: CreateSubscriptionsInput!) {
      createSubscriptions(input: $input) { __typename }
    }`,
    guarded: () => vi.spyOn(subscriptionApp, 'subscribeOrganizationsToService'),
    expected: ADMIN_ONLY,
    prepare: () =>
      Promise.resolve({
        variables: {
          input: {
            organization_id: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID],
            service_instance_id: FIXTURE.SERVICE_INSTANCE_ID,
            start_date: '2025-01-01',
          },
        },
        expectedData: {
          createSubscriptions: [{ __typename: 'SubscriptionModel' }],
        },
        cleanup: () =>
          TestHelper.subscription.delete({
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            service_instance_id: FIXTURE.SERVICE_INSTANCE_ID,
          }),
      }),
  });
});

describe('updateSubscription mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($subscriptionId: SubscriptionId!, $input: UpdateSubscriptionInput!) {
      updateSubscription(subscription_id: $subscriptionId, input: $input) { __typename }
    }`,
    guarded: () => vi.spyOn(subscriptionApp, 'updateSubscription'),
    expected: ADMIN_ONLY,
    prepare: async () => {
      const subscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: FIXTURE.SERVICE_INSTANCE_ID,
        start_date: new Date('2025-01-01'),
      });
      return {
        variables: {
          subscriptionId: subscription.id,
          input: { end_date: '2026-01-01' },
        },
        expectedData: {
          updateSubscription: { __typename: 'SubscriptionModel' },
        },
        cleanup: () => TestHelper.subscription.delete({ id: subscription.id }),
      };
    },
  });
});

describe('deleteSubscriptions mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($subscriptionIds: [SubscriptionId!]!) {
      deleteSubscriptions(subscription_ids: $subscriptionIds) { __typename }
    }`,
    guarded: () => vi.spyOn(subscriptionApp, 'deleteSubscriptions'),
    expected: ADMIN_ONLY,
    prepare: async () => {
      const subscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: FIXTURE.SERVICE_INSTANCE_ID,
        start_date: new Date('2025-01-01'),
      });
      return {
        variables: { subscriptionIds: [subscription.id] },
        expectedData: {
          deleteSubscriptions: [{ __typename: 'SubscriptionModel' }],
        },
        cleanup: () => TestHelper.subscription.delete({ id: subscription.id }),
      };
    },
  });
});
