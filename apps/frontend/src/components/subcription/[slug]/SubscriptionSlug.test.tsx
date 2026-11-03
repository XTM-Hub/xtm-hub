import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';
import testRender from '@/utils/test/test-render';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { subscriptionByIdQuery } from '@generated/subscriptionByIdQuery.graphql';
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

let mockSubscriptionById: typeof SUBSCRIPTION | null;

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  usePreloadedQuery: () => ({ subscriptionById: mockSubscriptionById }),
  useRefetchableFragment: () => [
    { userServiceFromSubscription: { __id: 'connection-1', edges: [] } },
    vi.fn(),
  ],
  useMutation: () => [vi.fn(), {}],
}));

const renderSubscriptionSlug = (
  serviceInstance?: serviceInstance_fragment$data
) =>
  testRender(
    <SubscriptionSlug
      queryRef={
        {} as unknown as PreloadedQuery<userServiceFromSubscriptionQuery>
      }
      queryRefSubscription={
        {} as unknown as PreloadedQuery<subscriptionByIdQuery>
      }
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
      mockSubscriptionById = null;
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
    mockSubscriptionById = SUBSCRIPTION;

    // When the admin page renders
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText(ORGANIZATION_NAME)).toBeInTheDocument();
  });
});
