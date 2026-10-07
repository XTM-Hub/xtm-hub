import OrganizationSubscribedServices from '@/components/organization/[slug]/subscribed-services/OrganizationSubscribedServices';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  OrganizationSubscribedServicesListQuery,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
  ServiceInstanceTag,
  SubscriptionOrdering,
} from '@graphql/generated';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const graphqlMocks = vi.hoisted(() => ({
  useOrganizationSubscribedServicesListQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((_variables: unknown) => [
      'OrganizationSubscribedServicesList',
    ]),
    getRootKey: vi.fn(() => ['OrganizationSubscribedServicesList']),
  }),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  return {
    ...actual,
    useOrganizationSubscribedServicesListQuery:
      graphqlMocks.useOrganizationSubscribedServicesListQuery,
  };
});

vi.mock('usehooks-ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('usehooks-ts')>();
  return {
    ...actual,
    useDebounceCallback: (callback: (event: unknown) => void) => callback,
  };
});

vi.mock('@filigran/ui', () => ({
  DataTableHeadBarOptions: () => <div>DataTableHeadBarOptions</div>,
  DataTable: ({
    data,
    isLoading,
    toolbar,
  }: {
    data: Array<{ id: string; service_instance: { name: string } }>;
    isLoading?: boolean;
    toolbar?: ReactNode;
  }) => (
    <div>
      {isLoading ? <div>loading</div> : null}
      {data.map((row) => (
        <div key={row.id}>{row.service_instance.name}</div>
      ))}
      {toolbar}
    </div>
  ),
}));

vi.mock(
  '@/components/organization/[slug]/subscribed-services/organization-subscribed-services-localstorage',
  () => ({
    useOrganizationSubscribedServicesLocalstorage: () => ({
      pageSize: 50,
      setPageSize: vi.fn(),
      orderMode: OrderingMode.Asc,
      setOrderMode: vi.fn(),
      orderBy: SubscriptionOrdering.StartDate,
      setOrderBy: vi.fn(),
      removeOrder: vi.fn(),
      columnOrder: [],
      setColumnOrder: vi.fn(),
      columnVisibility: {},
      setColumnVisibility: vi.fn(),
      resetAll: vi.fn(),
    }),
    normalizeSubscribedServicesPageSize: (value: number) => value,
  })
);

const baseQueryResponse: OrganizationSubscribedServicesListQuery = {
  __typename: 'Query',
  subscriptions: {
    __typename: 'SubscriptionConnection',
    totalCount: 1,
    edges: [
      {
        __typename: 'SubscriptionEdge',
        node: {
          __typename: 'SubscriptionModel',
          id: 'subscription-1',
          start_date: '2026-01-01',
          service_instance: {
            __typename: 'ServiceInstance',
            id: 'service-1',
            name: 'OpenCTI',
            creation_status: ServiceInstanceCreationStatus.Ready,
            tags: [ServiceInstanceTag.OpenCti],
            service_definition: {
              __typename: 'ServiceDefinition',
              id: 'definition-1',
              name: 'OpenCTI',
              identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
            },
          },
        },
      },
    ],
    pageInfo: {
      __typename: 'PageInfo',
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  },
};

describe('OrganizationSubscribedServices', () => {
  it('renders subscribed services from query data', async () => {
    graphqlMocks.useOrganizationSubscribedServicesListQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });

    testRender(
      <OrganizationSubscribedServices organizationId="organization-1" />
    );

    expect(await screen.findByText('OpenCTI')).toBeInTheDocument();
    expect(
      screen.queryByText('Service.SubscribedServicesList.NoSubscribedServices')
    ).not.toBeInTheDocument();
  });

  it('shows error message when query fails', async () => {
    graphqlMocks.useOrganizationSubscribedServicesListQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    });

    testRender(
      <OrganizationSubscribedServices organizationId="organization-1" />
    );

    expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
  });

  it('shows empty state only after loading finishes', async () => {
    graphqlMocks.useOrganizationSubscribedServicesListQuery.mockReturnValue({
      data: {
        __typename: 'Query',
        subscriptions: {
          __typename: 'SubscriptionConnection',
          totalCount: 0,
          edges: [],
          pageInfo: {
            __typename: 'PageInfo',
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
      },
      isError: false,
      isLoading: true,
    });

    const { rerender } = testRender(
      <OrganizationSubscribedServices organizationId="organization-1" />
    );

    expect(
      screen.queryByText('Service.SubscribedServicesList.NoSubscribedServices')
    ).not.toBeInTheDocument();

    graphqlMocks.useOrganizationSubscribedServicesListQuery.mockReturnValue({
      data: {
        __typename: 'Query',
        subscriptions: {
          __typename: 'SubscriptionConnection',
          totalCount: 0,
          edges: [],
          pageInfo: {
            __typename: 'PageInfo',
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
      },
      isError: false,
      isLoading: false,
    });

    rerender(
      <OrganizationSubscribedServices organizationId="organization-1" />
    );

    expect(
      await screen.findByText(
        'Service.SubscribedServicesList.NoSubscribedServices'
      )
    ).toBeInTheDocument();
  });

  it('sends search term to backend query variables', async () => {
    graphqlMocks.useOrganizationSubscribedServicesListQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });

    testRender(
      <OrganizationSubscribedServices organizationId="organization-1" />
    );

    fireEvent.change(screen.getByPlaceholderText('Service.SearchServices'), {
      target: { value: 'opencti' },
    });

    await waitFor(() => {
      const lastCall =
        graphqlMocks.useOrganizationSubscribedServicesListQuery.mock.calls.at(
          -1
        );
      expect(lastCall?.[1]).toMatchObject({
        searchTerm: 'opencti',
      });
    });
  });
});
