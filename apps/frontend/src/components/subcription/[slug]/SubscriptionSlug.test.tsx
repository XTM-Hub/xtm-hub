import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';
import testRender from '@/utils/test/test-render';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { userServiceFromSubscriptionQuery } from '@generated/userServiceFromSubscriptionQuery.graphql';
import { screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { PreloadedQuery } from 'react-relay';
import { describe, expect, it, vi } from 'vitest';

const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';
const ORGANIZATION_NAME = 'Subscribed Organization';

const SUBSCRIPTION = {
  id: 'subscription-1',
  organization: { id: 'organization-1', name: ORGANIZATION_NAME },
  service_instance: {
    id: 'service-instance-1',
    name: 'Service',
    description: null,
    tags: [],
    service_definition: { service_capability: [] },
  },
  subscription_capability: [],
};

const SERVICE_INSTANCE = {
  id: 'service-instance-1',
  name: 'Service',
  service_definition: { identifier: 'custom_dashboards' },
} as unknown as serviceInstance_fragment$data;

const mocks = vi.hoisted(() => ({
  useSubscriptionByIdQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSubscriptionByIdQuery: mocks.useSubscriptionByIdQuery,
  });
});

const mockSubscriptionQuery = (subscriptionById: typeof SUBSCRIPTION | null) =>
  mocks.useSubscriptionByIdQuery.mockReturnValue({
    data: { subscriptionById },
  });

vi.mock('@/components/Loader', () => ({ default: () => <div>loader</div> }));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  usePreloadedQuery: () => ({}),
  useRefetchableFragment: () => [
    { userServiceFromSubscription: { __id: 'connection-1', edges: [] } },
    vi.fn(),
  ],
  useMutation: () => [vi.fn(), {}],
}));

type SubscriptionQueryOptions = {
  throwOnError: (error: Error, query: { state: { data: unknown } }) => boolean;
};

const lastQueryOptions = () =>
  mocks.useSubscriptionByIdQuery.mock.lastCall?.[2] as SubscriptionQueryOptions;

const renderSubscriptionSlug = (
  serviceInstance?: serviceInstance_fragment$data
) =>
  testRender(
    <SubscriptionSlug
      queryRef={
        {} as unknown as PreloadedQuery<userServiceFromSubscriptionQuery>
      }
      subscriptionId={SUBSCRIPTION.id}
      serviceInstance={serviceInstance}
    />
  );

describe('SubscriptionSlug', () => {
  it.each([
    { page: 'admin', serviceInstance: undefined },
    { page: 'manage', serviceInstance: SERVICE_INSTANCE },
  ])(
    'should redirect to the not found page when the subscription cannot be loaded on the $page page',
    ({ serviceInstance }) => {
      // Given a subscription that cannot be loaded
      mockSubscriptionQuery(null);
      vi.mocked(notFound).mockImplementation(() => {
        throw new Error(NOT_FOUND_ERROR);
      });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // When the page renders
      const render = () => renderSubscriptionSlug(serviceInstance);

      // Then
      expect(render).toThrow(NOT_FOUND_ERROR);
    }
  );

  it('should display the subscription organization in the breadcrumb when the subscription is loaded', () => {
    // Given a loaded subscription
    mockSubscriptionQuery(SUBSCRIPTION);

    // When the admin page renders
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText(ORGANIZATION_NAME)).toBeInTheDocument();
  });

  it('should display the loader while the subscription is loading', () => {
    // Given a subscription still loading
    mocks.useSubscriptionByIdQuery.mockReturnValue({ data: undefined });

    // When the admin page renders
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText('loader')).toBeInTheDocument();
    expect(screen.queryByText(ORGANIZATION_NAME)).not.toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('should read the subscription of the page', () => {
    // Given a loaded subscription
    mockSubscriptionQuery(SUBSCRIPTION);

    // When the admin page renders
    renderSubscriptionSlug();

    // Then
    expect(mocks.useSubscriptionByIdQuery.mock.lastCall?.[1]).toEqual({
      subscriptionId: SUBSCRIPTION.id,
    });
  });

  it('should send the error to the error page when a load fails before the subscription is shown', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);
    renderSubscriptionSlug();

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data: undefined },
    });

    // Then
    expect(shouldThrow).toBe(true);
  });

  it('should keep the subscription on screen when a background refetch fails', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);
    renderSubscriptionSlug();

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data: { subscriptionById: SUBSCRIPTION } },
    });

    // Then
    expect(shouldThrow).toBe(false);
  });
});
