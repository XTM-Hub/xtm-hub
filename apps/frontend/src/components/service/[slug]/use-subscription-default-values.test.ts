import { SubscriptionItemFragment } from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSubscriptionDefaultValues } from './use-subscription-default-values';

export const makeSubscription = (
  orgId: string,
  overrides: Partial<SubscriptionItemFragment> = {}
): SubscriptionItemFragment =>
  ({
    id: `sub-${orgId}`,
    organization: { id: orgId, name: `Org ${orgId}`, personal_space: false },
    subscription_capability: [],
    service_instance: null,
    start_date: null,
    end_date: null,
    ...overrides,
  }) as unknown as SubscriptionItemFragment;

describe('useSubscriptionDefaultValues', () => {
  it('should return empty defaults when no subscriptionToEdit is provided', () => {
    const before = new Date();
    const { result } = renderHook(() =>
      useSubscriptionDefaultValues(undefined)
    );
    const after = new Date();

    expect(result.current.organization_id).toEqual([]);
    expect(result.current.capability_ids).toEqual([]);
    expect(result.current.start_date.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect(result.current.start_date.getTime()).toBeLessThanOrEqual(
      after.getTime()
    );
    expect(result.current.end_date).toBeUndefined();
  });

  it.each`
    description             | start_date      | end_date        | expectedStartSlice | expectedEndDefined
    ${'both dates defined'} | ${'2025-06-01'} | ${'2026-06-01'} | ${'2025-06-01'}    | ${true}
    ${'only start date'}    | ${'2025-03-15'} | ${null}         | ${'2025-03-15'}    | ${false}
  `(
    'should map dates correctly: $description',
    ({ start_date, end_date, expectedStartSlice, expectedEndDefined }) => {
      const subscription = makeSubscription('org-1', { start_date, end_date });
      const { result } = renderHook(() =>
        useSubscriptionDefaultValues(subscription)
      );

      expect(result.current.start_date.toISOString().slice(0, 10)).toBe(
        expectedStartSlice
      );
      if (expectedEndDefined) {
        expect(result.current.end_date).toBeDefined();
      } else {
        expect(result.current.end_date).toBeUndefined();
      }
    }
  );

  it('should pre-fill organization_id with the subscribed organization', () => {
    const subscription = makeSubscription('org-42');
    const { result } = renderHook(() =>
      useSubscriptionDefaultValues(subscription)
    );
    expect(result.current.organization_id).toEqual(['org-42']);
  });

  it('should pre-fill capability_ids with existing capabilities', () => {
    const subscription = makeSubscription('org-1', {
      subscription_capability: [
        {
          id: 'sc-1',
          service_capability: {
            id: 'cap-1',
            name: 'Upload',
            description: 'Upload',
            __typename: 'ServiceCapability',
          },
        },
        {
          id: 'sc-2',
          service_capability: {
            id: 'cap-2',
            name: 'Delete',
            description: 'Delete',
            __typename: 'ServiceCapability',
          },
        },
      ] as unknown as SubscriptionItemFragment['subscription_capability'],
    });
    const { result } = renderHook(() =>
      useSubscriptionDefaultValues(subscription)
    );
    expect(result.current.capability_ids).toEqual(['cap-1', 'cap-2']);
  });

  it('should filter out null capability ids', () => {
    const subscription = makeSubscription('org-1', {
      subscription_capability: [
        { id: 'sc-1', service_capability: null },
        {
          id: 'sc-2',
          service_capability: {
            id: 'cap-2',
            name: 'Delete',
            description: 'Delete',
            __typename: 'ServiceCapability',
          },
        },
      ] as unknown as SubscriptionItemFragment['subscription_capability'],
    });
    const { result } = renderHook(() =>
      useSubscriptionDefaultValues(subscription)
    );
    expect(result.current.capability_ids).toEqual(['cap-2']);
  });

  it('should return empty capability_ids when subscription has no capabilities', () => {
    const subscription = makeSubscription('org-1', {
      subscription_capability: [],
    });
    const { result } = renderHook(() =>
      useSubscriptionDefaultValues(subscription)
    );
    expect(result.current.capability_ids).toEqual([]);
  });
});
