import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  ServiceDefinitionIdentifier,
  ServiceInstanceItemFragment,
  UserServiceItemFragment,
  UserServiceOrdering,
  UserServicesFromSubscriptionQuery,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';
const ORGANIZATION_NAME = 'Subscribed Organization';
const MANAGED_SERVICE_NAME = 'Managed service';

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

const SERVICE_INSTANCE: ServiceInstanceItemFragment = {
  id: 'service-instance-1',
  name: 'Service',
  description: null,
  slug: null,
  capabilities: [],
  service_definition: {
    identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
  },
};

const USER_EMAIL = 'jane.doe@filigran.io';
const USER_SERVICE: UserServiceItemFragment = {
  id: 'user-service-1',
  user: {
    id: 'user-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: USER_EMAIL,
  },
  subscription: null,
  user_service_capability: [],
};

const USER_SERVICES: UserServicesFromSubscriptionQuery = {
  userServiceFromSubscription: {
    edges: [{ node: USER_SERVICE }, { node: null }],
  },
};

const mocks = vi.hoisted(() => ({
  useSubscriptionByIdQuery: vi.fn(),
  useUserServicesFromSubscriptionQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSubscriptionByIdQuery: mocks.useSubscriptionByIdQuery,
    useUserServicesFromSubscriptionQuery:
      mocks.useUserServicesFromSubscriptionQuery,
  });
});

vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({ data }: { data: UserServiceItemFragment[] }) => (
    <div>
      {data.map((userService) => (
        <span key={userService.id}>{userService.user?.email}</span>
      ))}
    </div>
  ),
}));

const mockSubscriptionQuery = (subscriptionById: typeof SUBSCRIPTION | null) =>
  mocks.useSubscriptionByIdQuery.mockReturnValue({
    data: { subscriptionById },
  });

vi.mock('@/components/Loader', () => ({ default: () => <div>loader</div> }));

type SubscriptionQueryOptions = {
  throwOnError: (error: Error, query: { state: { data: unknown } }) => boolean;
};

const lastQueryOptions = () =>
  mocks.useSubscriptionByIdQuery.mock.lastCall?.[2] as SubscriptionQueryOptions;

const renderSubscriptionSlug = (
  serviceInstance?: ServiceInstanceItemFragment
) =>
  testRender(
    <SubscriptionSlug
      subscriptionId={SUBSCRIPTION.id}
      serviceInstance={serviceInstance}
    />
  );

describe('SubscriptionSlug', () => {
  beforeEach(() => {
    mocks.useUserServicesFromSubscriptionQuery.mockReturnValue({
      data: USER_SERVICES,
    });
  });

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

  it('should list the users of the subscription', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText(USER_EMAIL)).toBeInTheDocument();
  });

  it('should read the users of the subscription ordered by first name', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug();

    // Then
    expect(
      mocks.useUserServicesFromSubscriptionQuery.mock.lastCall?.[1]
    ).toEqual({
      subscriptionId: SUBSCRIPTION.id,
      count: 50,
      orderBy: UserServiceOrdering.FirstName,
      orderMode: OrderingMode.Asc,
    });
  });

  it('should display the loader while the users are loading', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);
    mocks.useUserServicesFromSubscriptionQuery.mockReturnValue({
      data: undefined,
    });

    // When
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText('loader')).toBeInTheDocument();
  });

  it('should head the manage page with its own service instance', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug({ ...SERVICE_INSTANCE, name: MANAGED_SERVICE_NAME });

    // Then
    expect(
      screen.getByRole('heading', { name: MANAGED_SERVICE_NAME })
    ).toBeInTheDocument();
  });

  it('should head the admin page with the service instance of the subscription', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug();

    // Then
    expect(
      screen.getByRole('heading', { name: SUBSCRIPTION.service_instance.name })
    ).toBeInTheDocument();
  });
});
