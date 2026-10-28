import { SaasList } from '@/components/subcription/saas/SaasList';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  PortalCapability,
  SaasPlatformOrdering,
  type SaasPlatformRowFragment,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';

const CUSTOMER = 'Filigran';
const PLAN = 'Enterprise';
const PRODUCT = 'OCTI';
const PRODUCT_NAME = 'OpenCTI';
const VERSION = '6.8.1';
const CONTRACT_END_DATE = '2027-03-15T12:00:00.000Z';
const SEARCH_TERM = 'filigran';
const SERVICE_INSTANCE_ID = 'service-instance-id';
const ORGANIZATION_NAME = 'Filigran organization';
const ADMINISTRATOR_EMAILS = ['admin@filigran.io', 'other.admin@filigran.io'];

const mocks = vi.hoisted(() => ({
  useSaasManagerPlatformsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  return {
    ...actual,
    useSaasManagerPlatformsListQuery: Object.assign(
      mocks.useSaasManagerPlatformsListQuery,
      {
        getKey: actual.useSaasManagerPlatformsListQuery.getKey,
        getRootKey: actual.useSaasManagerPlatformsListQuery.getRootKey,
      }
    ),
  };
});

const renderWithCapabilities = (capabilities: PortalCapability[]) =>
  testRender(<SaasList />, {
    me: { capabilities: capabilities.map((name) => ({ name })) },
  });

const isQueryEnabled = () =>
  mocks.useSaasManagerPlatformsListQuery.mock.lastCall?.[2]?.enabled;

const lastQueryVariables = () =>
  mocks.useSaasManagerPlatformsListQuery.mock.lastCall?.[1];

const registeredPlatform: NonNullable<
  SaasPlatformRowFragment['registered_platform']
> = {
  id: SERVICE_INSTANCE_ID,
  service_instance_id: SERVICE_INSTANCE_ID,
  identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
  version: VERSION,
  organization: {
    id: 'organization-id',
    name: ORGANIZATION_NAME,
    administrator_emails: ADMINISTRATOR_EMAILS,
  },
};

const buildSaasPlatform = (
  overrides: Partial<SaasPlatformRowFragment> = {}
): SaasPlatformRowFragment => ({
  id: 'platform-id',
  product: PRODUCT,
  customer: CUSTOMER,
  metadata: {
    plan: PLAN,
    end_date: CONTRACT_END_DATE,
  },
  registered_platform: registeredPlatform,
  ...overrides,
});

const mockSaasPlatforms = (nodes: SaasPlatformRowFragment[]) =>
  mocks.useSaasManagerPlatformsListQuery.mockReturnValue({
    data: {
      saasManagerPlatforms: {
        totalCount: nodes.length,
        platforms: nodes,
      },
    },
    isLoading: false,
  });

const getAdministratorsCell = () => {
  const administratorsColumnIndex = screen
    .getAllByRole('columnheader')
    .findIndex((header) =>
      within(header).queryByText('CSMBoard.Administrators')
    );
  const [firstRow] = screen
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0);
  return within(firstRow).getAllByRole('cell')[administratorsColumnIndex];
};

describe('SaasList', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.useSaasManagerPlatformsListQuery.mockReset();
    mocks.useSaasManagerPlatformsListQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    // Back to the translator of setup-vitest, which gives back the bare key
    vi.mocked(useTranslations).mockReset();
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

  it.each([
    ['the query fails', { data: undefined, isError: true }],
    [
      'the SaaS Manager cannot be reached',
      { data: { saasManagerPlatforms: null }, isError: false },
    ],
  ])('should display an error message when %s', (_, queryResult) => {
    // Given
    mocks.useSaasManagerPlatformsListQuery.mockReturnValue({
      ...queryResult,
      isLoading: false,
    });

    // When
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then
    expect(screen.getByText('Utils.Error')).toBeInTheDocument();
  });

  it('should fetch saas platforms with the ordering and page size stored in localStorage', () => {
    // Given a user who previously changed the list settings
    localStorage.setItem('countSaasList', '100');
    localStorage.setItem(
      'orderBySaasList',
      JSON.stringify(SaasPlatformOrdering.Plan)
    );
    localStorage.setItem(
      'orderModeSaasList',
      JSON.stringify(OrderingMode.Desc)
    );

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then the stored settings are used as query variables
    expect(lastQueryVariables()).toEqual({
      page: 1,
      pageSize: 100,
      orderBy: SaasPlatformOrdering.Plan,
      orderMode: OrderingMode.Desc,
      searchTerm: null,
    });
  });

  it('should fetch the next page of the SaaS Manager when the user goes to the next page', async () => {
    // Given a list of more saas platforms than a page holds
    mocks.useSaasManagerPlatformsListQuery.mockReturnValue({
      data: {
        saasManagerPlatforms: {
          totalCount: 120,
          platforms: [buildSaasPlatform()],
        },
      },
      isLoading: false,
    });
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user goes to the next page
    await user.click(
      screen.getByRole('button', { name: 'DesignSystem.DataTable.NextPage' })
    );

    // Then the second page of the SaaS Manager is asked for
    expect(lastQueryVariables()).toMatchObject({ page: 2, pageSize: 50 });
  });

  it('should display the customer, the full product name and the plan of each saas platform', () => {
    // Given a saas platform listed by the SaaS Manager
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows each of its fields
    for (const value of [CUSTOMER, PRODUCT_NAME, PLAN]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it('should display the version and the contract end date of a saas platform registered in the Hub', () => {
    // Given a saas platform registered in the Hub with a contract end date
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows the version reported to the Hub and the contract end date
    expect(screen.getByText(VERSION)).toBeInTheDocument();
    expect(screen.getByText('Mar 15, 2027')).toBeInTheDocument();
  });

  it('should display no version for a saas platform that is not registered in the Hub', () => {
    // Given a saas platform the Hub does not know
    mockSaasPlatforms([buildSaasPlatform({ registered_platform: null })]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows no version
    expect(screen.queryByText(VERSION)).not.toBeInTheDocument();
  });

  it.each`
    description               | endDate                       | days  | className
    ${'in 90 days or more'}   | ${'2027-01-26T12:00:00.000Z'} | ${90} | ${'text-default-secondary'}
    ${'in less than 90 days'} | ${'2027-01-25T12:00:00.000Z'} | ${89} | ${'text-feedback-warning-primary'}
  `(
    'should display the $days days left on a contract that ends $description in $className',
    ({ endDate, days, className }) => {
      // Given a saas platform whose contract ends at a known date from now
      vi.useFakeTimers({
        toFake: ['Date'],
        now: new Date('2026-10-28T12:00:00.000Z'),
      });
      vi.mocked(useTranslations).mockReturnValue(((
        key: string,
        values?: Record<string, unknown>
      ) => (values ? `${key}:${JSON.stringify(values)}` : key)) as ReturnType<
        typeof useTranslations
      >);
      mockSaasPlatforms([
        buildSaasPlatform({
          metadata: {
            plan: PLAN,
            end_date: endDate,
          },
        }),
      ]);

      // When the list is rendered
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

      // Then its row shows the days left, colored after how soon the contract ends
      expect(
        screen.getByText(`CSMBoard.EndsIn:${JSON.stringify({ days })}`)
      ).toHaveClass(className);
    }
  );

  it('should display no contract end date for a saas platform without one', () => {
    // Given a saas platform the SaaS Manager knows no contract end date of
    mockSaasPlatforms([
      buildSaasPlatform({
        metadata: {
          plan: PLAN,
          end_date: null,
        },
      }),
    ]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows no contract end date
    expect(screen.queryByText('Mar 15, 2027')).not.toBeInTheDocument();
  });

  it('should display the logo and the metrics link of a saas platform registered in the Hub', () => {
    // Given a saas platform registered in the Hub
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row links to the metrics page of its service instance, after the logo of its product
    const link = screen.getByRole('link', { name: 'CSMBoard.ViewMetrics' });
    expect(link).toHaveAttribute(
      'href',
      `/app/service/opencti_registration/${SERVICE_INSTANCE_ID}`
    );
    expect(link.previousElementSibling?.tagName.toLowerCase()).toBe('svg');
  });

  it('should display the organization of a saas platform registered in the Hub', () => {
    // Given a saas platform registered in the Hub by an organization
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows the organization
    expect(screen.getByText(ORGANIZATION_NAME)).toBeInTheDocument();
  });

  it.each([
    ['is not registered in the Hub', null],
    [
      'has no organization in the Hub',
      { ...registeredPlatform, organization: null },
    ],
  ])(
    'should display no organization for a saas platform that %s',
    (_, registered_platform) => {
      // Given
      mockSaasPlatforms([buildSaasPlatform({ registered_platform })]);

      // When
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

      // Then
      expect(screen.queryByText(ORGANIZATION_NAME)).not.toBeInTheDocument();
    }
  );

  it('should display the emails of the organization administrators of a saas platform', () => {
    // Given a saas platform whose organization has several administrators
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then the administrators cell shows every administrator email
    expect(getAdministratorsCell()).toHaveTextContent(
      ADMINISTRATOR_EMAILS.join(', ')
    );
  });

  it('should list every administrator email in a tooltip when the organization has several administrators', async () => {
    // Given a saas platform whose organization has several administrators
    mockSaasPlatforms([buildSaasPlatform()]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user focuses the administrators cell
    fireEvent.focus(
      within(getAdministratorsCell()).getByText(ADMINISTRATOR_EMAILS.join(', '))
    );

    // Then a tooltip lists each administrator email
    const tooltip = await screen.findByRole('tooltip');
    for (const email of ADMINISTRATOR_EMAILS) {
      expect(within(tooltip).getByText(email)).toBeInTheDocument();
    }
  });

  it('should display the email without a tooltip when the organization has a single administrator', () => {
    // Given a saas platform whose organization has a single administrator
    const [email] = ADMINISTRATOR_EMAILS;
    mockSaasPlatforms([
      buildSaasPlatform({
        registered_platform: {
          ...registeredPlatform,
          organization: {
            id: 'organization-id',
            name: ORGANIZATION_NAME,
            administrator_emails: [email],
          },
        },
      }),
    ]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user focuses the administrators cell
    fireEvent.focus(within(getAdministratorsCell()).getByText(email));

    // Then the email is shown and no tooltip opens
    expect(getAdministratorsCell()).toHaveTextContent(email);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it.each([
    [
      'its organization has no administrator',
      {
        ...registeredPlatform,
        organization: {
          id: 'organization-id',
          name: ORGANIZATION_NAME,
          administrator_emails: [],
        },
      },
    ],
    [
      'it has no organization in the Hub',
      { ...registeredPlatform, organization: null },
    ],
    ['it is not registered in the Hub', null],
  ])(
    'should display no administrator for a saas platform when %s',
    (_, registered_platform) => {
      // Given a saas platform without any organization administrator
      mockSaasPlatforms([buildSaasPlatform({ registered_platform })]);

      // When the list is rendered
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

      // Then the administrators cell of its row is empty
      expect(getAdministratorsCell().textContent).toBe('');
    }
  );

  it('should display no metrics link for a saas platform that is not registered in the Hub', () => {
    // Given a saas platform the Hub does not know
    mockSaasPlatforms([buildSaasPlatform({ registered_platform: null })]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row has no metrics link
    expect(
      screen.queryByRole('link', { name: 'CSMBoard.ViewMetrics' })
    ).not.toBeInTheDocument();
  });

  it.each([
    ['CSMBoard.Organization'],
    ['CSMBoard.Administrators'],
    ['CSMBoard.Version'],
    ['CSMBoard.Link'],
  ])(
    'should keep the ordering when the user clicks the %s column header',
    (header) => {
      // Given the list ordered by customer ascending by default
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

      // When the user clicks a column header that cannot be sorted
      fireEvent.click(screen.getByText(header));

      // Then the saas platforms are still fetched in the default order
      expect(lastQueryVariables()).toMatchObject({
        orderBy: SaasPlatformOrdering.CustomerName,
        orderMode: OrderingMode.Asc,
      });
    }
  );

  it('should fetch saas platforms ordered by customer descending and store the ordering when the user sorts the customer column', () => {
    // Given the list ordered by customer ascending by default
    mockSaasPlatforms([buildSaasPlatform()]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user clicks the customer column header
    fireEvent.click(screen.getByText('CSMBoard.Customer'));

    // Then the saas platforms are fetched in descending order and the ordering is stored
    expect(lastQueryVariables()).toMatchObject({
      orderBy: SaasPlatformOrdering.CustomerName,
      orderMode: OrderingMode.Desc,
    });
    expect(localStorage.getItem('orderModeSaasList')).toBe(
      JSON.stringify(OrderingMode.Desc)
    );
  });

  it.each`
    header                    | orderBy
    ${'CSMBoard.Products'}    | ${SaasPlatformOrdering.Product}
    ${'CSMBoard.Plan'}        | ${SaasPlatformOrdering.Plan}
    ${'CSMBoard.ContractEnd'} | ${SaasPlatformOrdering.EndDate}
  `(
    'should fetch saas platforms ordered by $orderBy ascending when the user sorts the $header column',
    ({ header, orderBy }) => {
      // Given the list ordered by customer ascending by default
      mockSaasPlatforms([buildSaasPlatform()]);
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

      // When the user clicks another column header
      fireEvent.click(screen.getByText(header));

      // Then the saas platforms are fetched ordered by that column
      expect(lastQueryVariables()).toMatchObject({
        orderBy,
        orderMode: OrderingMode.Asc,
      });
    }
  );

  it('should fetch saas platforms filtered on what the user searches for', async () => {
    // Given the list of saas platforms
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user searches for a platform
    fireEvent.change(screen.getByLabelText('CSMBoard.SearchPlatform'), {
      target: { value: `  ${SEARCH_TERM}  ` },
    });

    // Then the saas platforms are fetched filtered on the trimmed search term
    await waitFor(() =>
      expect(lastQueryVariables()).toMatchObject({ searchTerm: SEARCH_TERM })
    );
  });

  it('should fetch every saas platform again when the user clears the search', async () => {
    // Given a list filtered on a search term
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
    fireEvent.change(screen.getByLabelText('CSMBoard.SearchPlatform'), {
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
