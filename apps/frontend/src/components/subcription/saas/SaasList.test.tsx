import { SaasList } from '@/components/subcription/saas/SaasList';
import { toCursor } from '@/hooks/use-table-pagination';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  PortalCapability,
  RegisteredPlatformOrdering,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { fireEvent, screen, waitFor } from '@testing-library/react';

const ORGANIZATION_NAME = 'Filigran';
const ADMINISTRATOR_EMAILS = ['admin@filigran.io', 'other.admin@filigran.io'];
const SERVICE_INSTANCE_ID = 'service-instance-id';
const PLATFORM_VERSION = '6.9.0';
const SEARCH_TERM = 'filigran';

const mocks = vi.hoisted(() => ({
  useSaasPlatformsListQuery: vi.fn(),
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

const renderWithCapabilities = (capabilities: PortalCapability[]) =>
  testRender(<SaasList />, {
    me: { capabilities: capabilities.map((name) => ({ name })) },
  });

const isQueryEnabled = () =>
  mocks.useSaasPlatformsListQuery.mock.lastCall?.[2]?.enabled;

const lastQueryVariables = () =>
  mocks.useSaasPlatformsListQuery.mock.lastCall?.[1];

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
  service_instance_id: SERVICE_INSTANCE_ID,
  identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
  title: 'SaaS OpenCTI platform',
  version: PLATFORM_VERSION,
  organization: { id: 'organization-id', name: ORGANIZATION_NAME },
  organization_administrators: ADMINISTRATOR_EMAILS.map((email) => ({
    id: email,
    email,
  })),
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
    expect(lastQueryVariables()).toEqual({
      first: 100,
      after: toCursor(100, 0),
      orderBy: RegisteredPlatformOrdering.PlatformTitle,
      orderMode: OrderingMode.Desc,
      searchTerm: null,
    });
  });

  it('should display the organization, product, logo, link and version of each saas platform', () => {
    // Given a saas platform registered by an organization
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows the organization, the product, the logo before the link and the version
    expect(screen.getByText(ORGANIZATION_NAME)).toBeInTheDocument();

    expect(screen.getByText('OpenCTI')).toBeInTheDocument();
    const link = screen.getByRole('link', {
      name: 'CSMBoard.ViewMetrics',
    });
    expect(link).toHaveAttribute(
      'href',
      `/app/service/opencti_registration/${SERVICE_INSTANCE_ID}`
    );
    expect(link.previousElementSibling?.tagName.toLowerCase()).toBe('svg');
    expect(screen.getByText(PLATFORM_VERSION)).toBeInTheDocument();
  });

  it('should fetch saas platforms ordered by organization name and store the ordering when the user sorts the organization column', () => {
    // Given the list ordered by organization name ascending by default, starting with a platform without organization
    mockSaasPlatforms([buildSaasPlatform({ organization: null })]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user clicks the organization column header
    fireEvent.click(screen.getByText('CSMBoard.Organization'));

    // Then the saas platforms are fetched in descending order and the ordering is stored
    expect(lastQueryVariables()).toMatchObject({
      orderBy: RegisteredPlatformOrdering.OrganizationName,
      orderMode: OrderingMode.Desc,
    });
    expect(localStorage.getItem('orderModeSaasList')).toBe(
      JSON.stringify(OrderingMode.Desc)
    );
  });

  it.each([
    ['CSMBoard.Products'],
    ['CSMBoard.Link'],
    ['CSMBoard.Version'],
  ])(
    'should keep the ordering when the user clicks the %s column header',
    (header) => {
      // Given the list ordered by organization name ascending by default
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

      // When the user clicks a column header that cannot be sorted
      fireEvent.click(screen.getByText(header));

      // Then the saas platforms are still fetched in the default order
      expect(lastQueryVariables()).toMatchObject({
        orderBy: RegisteredPlatformOrdering.OrganizationName,
        orderMode: OrderingMode.Asc,
      });
    }
  );

  it('should fetch saas platforms filtered on the organization the user searches for', async () => {
    // Given the list of saas platforms
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user searches for an organization
    fireEvent.change(screen.getByLabelText('CSMBoard.SearchOrganization'), {
      target: { value: `  ${SEARCH_TERM}  ` },
    });

    // Then the saas platforms are fetched filtered on the trimmed search term
    await waitFor(() =>
      expect(lastQueryVariables()).toMatchObject({ searchTerm: SEARCH_TERM })
    );
  });

  it('should fetch every saas platform again when the user clears the search', async () => {
    // Given a list filtered on an organization
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
    fireEvent.change(screen.getByLabelText('CSMBoard.SearchOrganization'), {
      target: { value: SEARCH_TERM },
    });
    await waitFor(() =>
      expect(lastQueryVariables()).toMatchObject({ searchTerm: SEARCH_TERM })
    );

    // When the user clears the search
    fireEvent.click(
      screen.getByRole('button', { name: 'CSMBoard.ClearSearch' })
    );

    // Then the saas platforms are fetched without search term
    expect(lastQueryVariables()).toMatchObject({ searchTerm: null });
  });
});
