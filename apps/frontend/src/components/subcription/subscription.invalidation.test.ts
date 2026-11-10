import { invalidateSubscriptionQueries } from '@/components/subcription/subscription.invalidation';
import {
  OrderingMode,
  SubscriptionOrdering,
  useOrganizationSubscribedServicesListQuery,
  useSubscriptionByIdQuery,
  useSubscriptionsListQuery,
} from '@graphql/generated';
import { organizationSubscribedServicesKeys } from '@graphql/organization-subscribed-services/organization-subscribed-services.keys';
import { serviceUserCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

describe('invalidateSubscriptionQueries', () => {
  it.each`
    key                                         | description
    ${subscriptionKeys.all()}                   | ${'the subscriptions of a service'}
    ${subscriptionKeys.allById()}               | ${'the subscription detail'}
    ${organizationSubscribedServicesKeys.all()} | ${'the subscribed services of an organization'}
    ${serviceUserCapabilitiesKeys.all()}        | ${'the capabilities of the user on a service'}
  `('should invalidate $description', async ({ key }) => {
    // Given
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();

    // When
    await invalidateSubscriptionQueries(queryClient);

    // Then
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key });
  });

  it('should invalidate the queries of the generated hooks and leave the others alone', async () => {
    // Given
    const queryClient = new QueryClient();
    const generatedKeys = [
      useSubscriptionsListQuery.getKey({
        count: 50,
        cursor: null,
        orderBy: SubscriptionOrdering.StartDate,
        orderMode: OrderingMode.Asc,
        filters: null,
        searchTerm: null,
      }),
      useSubscriptionByIdQuery.getKey({ subscriptionId: 'subscription-1' }),
      useOrganizationSubscribedServicesListQuery.getKey({
        count: 50,
        after: null,
        orderBy: SubscriptionOrdering.StartDate,
        orderMode: OrderingMode.Asc,
        filters: null,
        searchTerm: null,
      }),
      serviceUserCapabilitiesKeys.byService('service-1'),
    ];
    const unrelatedKey = ['UnrelatedQuery', { id: 'other' }];
    [...generatedKeys, unrelatedKey].forEach((key) =>
      queryClient.setQueryData(key, {})
    );

    // When
    await invalidateSubscriptionQueries(queryClient);

    // Then
    generatedKeys.forEach((key) =>
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
    );
    expect(queryClient.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
  });
});
