import OrganizationSubscribedServices from '@/components/organization/[slug]/subscribed-services/OrganizationSubscribedServices';
import testRender from '@/utils/test/test-render';
import {
  OrganizationSubscribedServiceRowFragment,
  OrganizationSubscribedServicesListQuery,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
  ServiceInstanceTag,
  SubscriptionOrdering,
} from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORGANIZATION_ID = 'organization-1';
const SERVICE_NAME = 'OpenCTI Production';
const SERVICE_TYPE_LABEL = `Service.ServiceDefinitionIdentifier.${ServiceDefinitionIdentifier.OpenctiRegistration}`;
const STATUS = ServiceInstanceCreationStatus.Ready;
const TAGS = [ServiceInstanceTag.OpenCti, ServiceInstanceTag.Trial];
// Midday UTC keeps the same calendar day in every timezone the tests may run in.
const START_DATE = '2026-01-15T12:00:00Z';
const FORMATTED_START_DATE = '1/15/2026';
const EMPTY_VALUE = '—';
const SERVICE_NAME_HEADER = 'Service.SubscribedServicesList.ServiceName';

const graphqlMocks = vi.hoisted(() => ({
  useOrganizationSubscribedServicesListQuery: Object.assign(vi.fn(), {
    getKey: vi.fn(() => ['OrganizationSubscribedServicesList']),
    getRootKey: vi.fn(() => ['OrganizationSubscribedServicesList']),
  }),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useOrganizationSubscribedServicesListQuery:
    graphqlMocks.useOrganizationSubscribedServicesListQuery,
}));

const makeSubscription = (
  overrides: Partial<
    Omit<OrganizationSubscribedServiceRowFragment, 'service_instance'>
  > & {
    service_instance?: Partial<
      OrganizationSubscribedServiceRowFragment['service_instance']
    >;
  } = {}
): OrganizationSubscribedServiceRowFragment => ({
  id: 'subscription-1',
  start_date: START_DATE,
  ...overrides,
  service_instance: {
    id: 'service-1',
    name: SERVICE_NAME,
    creation_status: STATUS,
    tags: TAGS,
    service_definition: {
      id: 'definition-1',
      name: 'OpenCTI Registration',
      identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
    },
    ...overrides.service_instance,
  },
});

const mockSubscriptions = (
  subscriptions: OrganizationSubscribedServiceRowFragment[]
) => {
  const response: OrganizationSubscribedServicesListQuery = {
    subscriptions: {
      totalCount: subscriptions.length,
      edges: subscriptions.map((node) => ({ node })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  };
  graphqlMocks.useOrganizationSubscribedServicesListQuery.mockReturnValue({
    data: response,
    isError: false,
    isLoading: false,
  });
};

describe('OrganizationSubscribedServices table', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should show the name, type, status, start date and tags of each subscribed service', async () => {
    // Given
    mockSubscriptions([makeSubscription()]);

    // When
    testRender(
      <OrganizationSubscribedServices organizationId={ORGANIZATION_ID} />
    );

    // Then
    const row = (await screen.findByText(SERVICE_NAME)).closest('tr')!;
    expect(within(row).getByText(SERVICE_TYPE_LABEL)).toBeInTheDocument();
    expect(within(row).getByText(STATUS)).toBeInTheDocument();
    expect(within(row).getByText(FORMATTED_START_DATE)).toBeInTheDocument();
    TAGS.forEach((tag) =>
      expect(within(row).getByText(tag)).toBeInTheDocument()
    );
  });

  it('should show a dash in place of every detail the service does not have', async () => {
    // Given
    mockSubscriptions([
      makeSubscription({
        start_date: null,
        service_instance: {
          creation_status: null,
          tags: [],
          service_definition: null,
        },
      }),
    ]);

    // When
    testRender(
      <OrganizationSubscribedServices organizationId={ORGANIZATION_ID} />
    );

    // Then
    const row = (await screen.findByText(SERVICE_NAME)).closest('tr')!;
    expect(within(row).getAllByText(EMPTY_VALUE)).toHaveLength(4);
  });

  it('should only request the services of the organization, by start date, when the page opens', async () => {
    // Given
    mockSubscriptions([makeSubscription()]);

    // When
    testRender(
      <OrganizationSubscribedServices organizationId={ORGANIZATION_ID} />
    );

    // Then
    await screen.findByText(SERVICE_NAME);
    expect(
      graphqlMocks.useOrganizationSubscribedServicesListQuery.mock.calls.at(
        -1
      )?.[1]
    ).toMatchObject({
      orderBy: SubscriptionOrdering.StartDate,
      filters: [{ value: [ORGANIZATION_ID] }],
    });
  });

  it('should request the services sorted by name when the user clicks the service name header', async () => {
    // Given
    mockSubscriptions([makeSubscription()]);
    const { user } = testRender(
      <OrganizationSubscribedServices organizationId={ORGANIZATION_ID} />
    );
    await screen.findByText(SERVICE_NAME);

    // When
    await user.click(screen.getByText(SERVICE_NAME_HEADER));

    // Then
    await waitFor(() =>
      expect(
        graphqlMocks.useOrganizationSubscribedServicesListQuery.mock.calls.at(
          -1
        )?.[1]
      ).toMatchObject({ orderBy: SubscriptionOrdering.ServiceName })
    );
  });
});
