import { SaasList } from '@/components/subcription/saas/SaasList';
import { toCursor } from '@/hooks/use-table-pagination';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  PortalCapability,
  RegisteredPlatformOrdering,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { act, screen } from '@testing-library/react';
import { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  useSaasPlatformsListQuery: vi.fn(),
  onSortingChange: undefined as ((updater: unknown) => void) | undefined,
  columns: [] as ColumnDef<{ id: string }>[],
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  return {
    ...actual,
    useSaasPlatformsListQuery: Object.assign(mocks.useSaasPlatformsListQuery, {
      getKey: actual.useSaasPlatformsListQuery.getKey,
      getRootKey: actual.useSaasPlatformsListQuery.getRootKey,
    }),
  };
});

vi.mock('@filigran/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  DataTable: ({
    columns,
    data,
    tableOptions,
  }: {
    columns: ColumnDef<{ id: string }>[];
    data: { id: string }[];
    tableOptions: { onSortingChange: (updater: unknown) => void };
  }) => {
    mocks.onSortingChange = tableOptions.onSortingChange;
    mocks.columns = columns;
    return (
      <div>
        {data.map((row) => (
          <div key={row.id}>
            {columns.map((column) => (
              <div key={column.id}>
                {typeof column.cell === 'function'
                  ? (column.cell({
                      row: { original: row },
                    } as never) as ReactNode)
                  : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  },
  DataTableHeadBarOptions: () => <div>DataTableHeadBarOptions</div>,
}));

const renderWithCapabilities = (capabilities: PortalCapability[]) =>
  testRender(<SaasList />, {
    me: { capabilities: capabilities.map((name) => ({ name })) },
  });

const isQueryEnabled = () =>
  mocks.useSaasPlatformsListQuery.mock.lastCall?.[2]?.enabled;

const buildSaasPlatform = (
  overrides: Partial<{
    id: string;
    service_instance_id: string;
    identifier: ServiceDefinitionIdentifier;
    title: string;
    version: string | null;
    organization: { id: string; name: string } | null;
  }> = {}
) => ({
  id: 'platform-id',
  service_instance_id: 'service-instance-id',
  identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
  title: 'SaaS OpenCTI platform',
  version: '6.9.0',
  organization: { id: 'organization-id', name: 'Filigran' },
  ...overrides,
});

const mockSaasPlatforms = (nodes: ReturnType<typeof buildSaasPlatform>[]) =>
  mocks.useSaasPlatformsListQuery.mockReturnValue({
    data: {
      saasPlatforms: {
        totalCount: nodes.length,
        edges: nodes.map((node) => ({ node })),
      },
    },
    isLoading: false,
  });

describe('SaasList', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.useSaasPlatformsListQuery.mockReset();
    mocks.useSaasPlatformsListQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it.each([[PortalCapability.Bypass], [PortalCapability.ReadSaasMetrics]])(
    'should fetch saas platforms when user has the %s capability',
    (capability) => {
      // Given a user granted to read saas metrics
      // When the list is rendered
      renderWithCapabilities([capability]);

      // Then the saas platforms query is enabled
      expect(isQueryEnabled()).toBe(true);
    }
  );

  it.each([[[]], [[PortalCapability.ReadTrials]]])(
    'should not fetch saas platforms when user capabilities are %j',
    (capabilities) => {
      // Given a user without the capability to read saas metrics
      // When the list is rendered
      renderWithCapabilities(capabilities);

      // Then the saas platforms query is disabled
      expect(isQueryEnabled()).toBe(false);
    }
  );

  it('should fetch saas platforms with the ordering and page size stored in localStorage', () => {
    // Given a user who previously changed the list settings
    localStorage.setItem('countSaasList', '100');
    localStorage.setItem(
      'orderBySaasList',
      JSON.stringify(RegisteredPlatformOrdering.PlatformTitle)
    );
    localStorage.setItem(
      'orderModeSaasList',
      JSON.stringify(OrderingMode.Desc)
    );

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then the stored settings are used as query variables
    expect(mocks.useSaasPlatformsListQuery.mock.lastCall?.[1]).toEqual({
      first: 100,
      after: toCursor(100, 0),
      orderBy: RegisteredPlatformOrdering.PlatformTitle,
      orderMode: OrderingMode.Desc,
    });
  });

  it('should display the organization, product, logo, link and version of each saas platform', () => {
    // Given a saas platform registered by an organization
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows the organization, the product, the logo before the link and the version
    expect(screen.getByText('Filigran')).toBeInTheDocument();
    expect(screen.getByText('OpenCTI')).toBeInTheDocument();
    const link = screen.getByRole('link', {
      name: 'CSMBoard.ViewMetrics',
    });
    expect(link).toHaveAttribute(
      'href',
      '/app/service/opencti_registration/service-instance-id'
    );
    expect(link.previousElementSibling?.tagName.toLowerCase()).toBe('svg');
    expect(screen.getByText('6.9.0')).toBeInTheDocument();
  });

  it('should fetch saas platforms ordered by organization name and store the ordering when the user sorts by organization', () => {
    // Given the list rendered with its default ordering
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user sorts the organization column in descending order
    act(() => {
      mocks.onSortingChange?.([
        { id: RegisteredPlatformOrdering.OrganizationName, desc: true },
      ]);
    });

    // Then the saas platforms are fetched in that order and the ordering is stored
    expect(mocks.useSaasPlatformsListQuery.mock.lastCall?.[1]).toMatchObject({
      orderBy: RegisteredPlatformOrdering.OrganizationName,
      orderMode: OrderingMode.Desc,
    });
    expect(localStorage.getItem('orderBySaasList')).toBe(
      JSON.stringify(RegisteredPlatformOrdering.OrganizationName)
    );
    expect(localStorage.getItem('orderModeSaasList')).toBe(
      JSON.stringify(OrderingMode.Desc)
    );
  });

  it('should only let the user sort the organization column', () => {
    // Given the list of saas platforms
    // When it is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then only the organization column has an accessor, which react-table requires to sort it
    const sortableColumnIds = mocks.columns
      .filter(
        (column) => 'accessorFn' in column && column.enableSorting !== false
      )
      .map((column) => column.id);
    expect(sortableColumnIds).toEqual([
      RegisteredPlatformOrdering.OrganizationName,
    ]);
  });
});
