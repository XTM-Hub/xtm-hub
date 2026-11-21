import AdminServiceList from '@/components/service/AdminServiceList';
import { ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS } from '@/components/service/AdminServiceTab';
import testRender from '@/utils/test/test-render';
import {
  type AdminServiceInstanceItemFragment,
  type AdminServiceInstancesListQuery,
  type AdminServiceInstancesListQueryVariables,
  OrderingMode,
  ServiceDefinitionIdentifier,
  ServiceInstanceFilterKey,
  ServiceInstanceOrdering,
} from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAdminServiceInstancesListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useAdminServiceInstancesListQuery: mocks.useAdminServiceInstancesListQuery,
  });
});

vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({
    toolbar,
    data,
  }: {
    toolbar?: ReactNode;
    data: AdminServiceInstanceItemFragment[];
  }) => (
    <div>
      {toolbar}
      {data.map((service) => (
        <span key={service.id}>{service.name}</span>
      ))}
    </div>
  ),
}));

vi.mock('@/components/Loader', () => ({ default: () => <div>loader</div> }));

const SERVICE_NAME = 'OpenCTI playbooks';
const SEARCH_LABEL = 'Service.SearchServices';
const FILTER_LABEL = 'Service.FilterByService';
const SEARCH_TERM = 'playbook';
const PICKED_SERVICE = ServiceDefinitionIdentifier.OpenctiPlaybooks;

const SERVICE: AdminServiceInstanceItemFragment = {
  id: 'service-instance-1',
  name: SERVICE_NAME,
  description: null,
  creation_status: null,
  capabilities: [],
  public: true,
  tags: null,
  links: null,
  service_definition: null,
  logo_document_id: null,
  illustration_document_id: null,
  slug: null,
  ordering: 0,
};

const LIST: AdminServiceInstancesListQuery = {
  serviceInstances: { edges: [{ node: SERVICE }, { node: null }] },
};

const ALL_ADMINISTRABLE_SERVICES_FILTER = [
  {
    key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
    value: ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS,
  },
];

const lastQueryVariables = () =>
  mocks.useAdminServiceInstancesListQuery.mock
    .lastCall?.[1] as AdminServiceInstancesListQueryVariables;

describe('AdminServiceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAdminServiceInstancesListQuery.mockReturnValue({ data: LIST });
  });

  it('should list every administrable service, including the inaccessible ones', () => {
    // When
    testRender(<AdminServiceList />);

    // Then
    expect(lastQueryVariables()).toEqual({
      count: 50,
      orderBy: ServiceInstanceOrdering.Name,
      orderMode: OrderingMode.Asc,
      searchTerm: '',
      includeInaccessible: true,
      filters: ALL_ADMINISTRABLE_SERVICES_FILTER,
    });
  });

  it('should display the loaded services', () => {
    // When
    testRender(<AdminServiceList />);

    // Then
    expect(screen.getByText(SERVICE_NAME)).toBeInTheDocument();
  });

  it('should display the loader while the services are loading', () => {
    // Given
    mocks.useAdminServiceInstancesListQuery.mockReturnValue({
      data: undefined,
    });

    // When
    testRender(<AdminServiceList />);

    // Then
    expect(screen.getByText('loader')).toBeInTheDocument();
  });

  it('should keep the service definition filter when the admin searches', async () => {
    // Given
    const { user } = testRender(<AdminServiceList />);

    // When
    await user.type(
      screen.getByRole('searchbox', { name: SEARCH_LABEL }),
      SEARCH_TERM
    );

    // Then
    await waitFor(() =>
      expect(lastQueryVariables()).toMatchObject({
        searchTerm: SEARCH_TERM,
        filters: ALL_ADMINISTRABLE_SERVICES_FILTER,
      })
    );
  });

  it('should keep the search term when the admin picks a service definition', async () => {
    // Given
    const { user } = testRender(<AdminServiceList />);
    await user.type(
      screen.getByRole('searchbox', { name: SEARCH_LABEL }),
      SEARCH_TERM
    );
    await waitFor(() =>
      expect(lastQueryVariables().searchTerm).toBe(SEARCH_TERM)
    );

    // When
    await user.click(screen.getByRole('combobox', { name: FILTER_LABEL }));
    await user.click(
      screen.getByRole('option', {
        name: `Service.ServiceDefinitionIdentifier.${PICKED_SERVICE}`,
      })
    );

    // Then
    expect(lastQueryVariables()).toMatchObject({
      searchTerm: SEARCH_TERM,
      filters: [
        {
          key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
          value: [PICKED_SERVICE],
        },
      ],
    });
  });
});
