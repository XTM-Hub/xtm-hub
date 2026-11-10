import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  SubscriptionFilterKey,
  SubscriptionItemFragment,
  SubscriptionOrdering,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PageLoader from './page-loader';

const mocks = vi.hoisted(() => ({
  useSubscriptionsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSubscriptionsListQuery: mocks.useSubscriptionsListQuery,
  });
});

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useQueryLoader: () => [{}, vi.fn()],
}));

vi.mock('@/components/Loader', () => ({ default: () => <div>loader</div> }));

vi.mock('@/components/service/[slug]/ServiceSlug', () => ({
  default: ({
    subscriptions,
  }: {
    subscriptions: SubscriptionItemFragment[];
  }) => <div>subscriptions-{subscriptions.map(({ id }) => id).join(',')}</div>,
}));

const SERVICE_INSTANCE_ID = 'service-instance-1';
const SUBSCRIPTION = {
  id: 'subscription-1',
  organization: {
    id: 'organization-1',
    name: 'Acme Corporation',
    personal_space: false,
  },
  subscription_capability: [],
  service_instance: { id: SERVICE_INSTANCE_ID, name: 'OpenCTI Library' },
  start_date: null,
  end_date: null,
};
const LIST_RESPONSE = {
  subscriptions: {
    totalCount: 1,
    edges: [{ node: SUBSCRIPTION }],
  },
};

type ListQueryOptions = {
  throwOnError: (error: Error, query: { state: { data: unknown } }) => boolean;
};

const mockListQuery = (data: typeof LIST_RESPONSE | undefined) =>
  mocks.useSubscriptionsListQuery.mockReturnValue({ data });

const lastListVariables = () =>
  mocks.useSubscriptionsListQuery.mock.lastCall?.[1];

const lastListOptions = () =>
  mocks.useSubscriptionsListQuery.mock.lastCall?.[2] as ListQueryOptions;

describe('Admin service PageLoader', () => {
  it('should list the first 50 subscriptions of the service ordered by start date when it renders', () => {
    // Given
    mockListQuery(LIST_RESPONSE);

    // When
    testRender(<PageLoader id={SERVICE_INSTANCE_ID} />);

    // Then
    expect(lastListVariables()).toEqual({
      count: 50,
      cursor: null,
      orderBy: SubscriptionOrdering.StartDate,
      orderMode: OrderingMode.Asc,
      searchTerm: '',
      filters: [
        {
          key: SubscriptionFilterKey.ServiceInstanceId,
          value: [SERVICE_INSTANCE_ID],
        },
      ],
    });
  });

  it('should give the subscriptions to the service page when they are loaded', () => {
    // Given
    mockListQuery(LIST_RESPONSE);

    // When
    testRender(<PageLoader id={SERVICE_INSTANCE_ID} />);

    // Then
    expect(
      screen.getByText(`subscriptions-${SUBSCRIPTION.id}`)
    ).toBeInTheDocument();
  });

  it('should display the loader while the subscriptions are loading', () => {
    // Given
    mockListQuery(undefined);

    // When
    testRender(<PageLoader id={SERVICE_INSTANCE_ID} />);

    // Then
    expect(screen.getByText('loader')).toBeInTheDocument();
  });

  it('should send the error to the error page when a load fails before any subscription is shown', () => {
    // Given
    mockListQuery(LIST_RESPONSE);
    testRender(<PageLoader id={SERVICE_INSTANCE_ID} />);

    // When
    const shouldThrow = lastListOptions().throwOnError(new Error(), {
      state: { data: undefined },
    });

    // Then
    expect(shouldThrow).toBe(true);
  });

  it('should keep the subscriptions on screen when a background refetch fails', () => {
    // Given
    mockListQuery(LIST_RESPONSE);
    testRender(<PageLoader id={SERVICE_INSTANCE_ID} />);

    // When
    const shouldThrow = lastListOptions().throwOnError(new Error(), {
      state: { data: LIST_RESPONSE },
    });

    // Then
    expect(shouldThrow).toBe(false);
  });
});
