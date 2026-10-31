import { SaasList } from '@/components/subcription/saas/SaasList';
import {
  getSaasListTourSteps,
  HIGHLIGHTED_ROW_COUNT,
} from '@/components/subcription/saas/tour/saas-list-tour';
import type { useTranslate } from '@/hooks/use-translate';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  PortalCapability,
  SaasPlatformContractStatus,
  SaasPlatformHealthIssue,
  SaasPlatformOrdering,
  type SaasPlatformRowFragment,
  SaasProduct,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

const CUSTOMER = 'Filigran';
const PLAN = 'Enterprise';
const PRODUCT = SaasProduct.Octi;
const PRODUCT_NAME = 'OpenCTI';
const VERSION = '6.8.1';
const CONTRACT_END_DATE = '2027-03-15T12:00:00.000Z';
const DATABASE_USAGE_PERCENT = 57.4;
const FILE_STORAGE_USAGE_PERCENT = 93;
const AVAILABILITY = 0.9996;
const ALERT_PROGRESS_BAR_CLASS =
  '[&>[data-slot=progress-bar-indicator]]:bg-feedback-alert-primary';
const CELL_WIDTH = 120;
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

const registeredPlatformWithoutAdministrators: NonNullable<
  SaasPlatformRowFragment['registered_platform']
> = {
  ...registeredPlatform,
  organization: {
    id: 'organization-id',
    name: ORGANIZATION_NAME,
    administrator_emails: [],
  },
};

const buildSaasPlatform = (
  overrides: Partial<SaasPlatformRowFragment> = {}
): SaasPlatformRowFragment => ({
  id: 'platform-id',
  product: PRODUCT,
  customer: CUSTOMER,
  sla_cmtd: AVAILABILITY,
  storage: {
    es_used_size: { percent: DATABASE_USAGE_PERCENT },
    s3_used_size: { percent: FILE_STORAGE_USAGE_PERCENT },
  },
  health_issues: [
    SaasPlatformHealthIssue.Availability,
    SaasPlatformHealthIssue.FileStorage,
  ],
  contract_status: SaasPlatformContractStatus.Active,
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

const getColumnHeader = (columnId: string) =>
  document.querySelector(`th[data-column-id="${columnId}"]`);

const hideColumn = async (
  user: ReturnType<typeof testRender>['user'],
  columnId: string
) => {
  await user.click(
    within(getColumnHeader(columnId) as HTMLElement).getByRole('button', {
      name: 'DesignSystem.DataTable.ColumnOptions',
    })
  );
  await user.click(
    await screen.findByRole('menuitem', {
      name: 'DesignSystem.DataTable.HideColumn',
    })
  );
  await waitFor(() => expect(getColumnHeader(columnId)).toBeNull());
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
      product: null,
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

  it.each`
    field                                       | name                 | description           | width             | hasTooltip
    ${'customer'}                               | ${CUSTOMER}          | ${'is cut off'}       | ${CELL_WIDTH + 1} | ${true}
    ${'customer'}                               | ${CUSTOMER}          | ${'fits in its cell'} | ${CELL_WIDTH}     | ${false}
    ${'organization without any administrator'} | ${ORGANIZATION_NAME} | ${'is cut off'}       | ${CELL_WIDTH + 1} | ${true}
    ${'organization without any administrator'} | ${ORGANIZATION_NAME} | ${'fits in its cell'} | ${CELL_WIDTH}     | ${false}
  `(
    'should show the full $field name in a tooltip: $hasTooltip, when it $description',
    async ({ name, width, hasTooltip }) => {
      // Given a saas platform whose name is a known width in its cell
      mockSaasPlatforms([
        buildSaasPlatform({
          registered_platform: registeredPlatformWithoutAdministrators,
        }),
      ]);
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
      const nameText = screen.getByText(name);
      Object.defineProperty(nameText, 'scrollWidth', { value: width });
      Object.defineProperty(nameText, 'clientWidth', { value: CELL_WIDTH });

      // When the user focuses the name
      fireEvent.focus(nameText);

      // Then only a cut off name is shown in full in a tooltip
      if (hasTooltip) {
        const tooltip = await screen.findByRole('tooltip');
        expect(within(tooltip).getByText(name)).toBeInTheDocument();
      } else {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      }
    }
  );

  it('should list the organization administrators in a tooltip on the organization, even when its name fits', async () => {
    // Given a saas platform whose organization has several administrators and a name that fits in its cell
    mockSaasPlatforms([buildSaasPlatform()]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
    const organizationName = screen.getByText(ORGANIZATION_NAME);
    Object.defineProperty(organizationName, 'scrollWidth', {
      value: CELL_WIDTH,
    });
    Object.defineProperty(organizationName, 'clientWidth', {
      value: CELL_WIDTH,
    });

    // When the user focuses the organization
    fireEvent.focus(organizationName);

    // Then a tooltip shows the organization name and each administrator email
    const tooltip = await screen.findByRole('tooltip');
    for (const text of [ORGANIZATION_NAME, ...ADMINISTRATOR_EMAILS]) {
      expect(within(tooltip).getByText(text)).toBeInTheDocument();
    }
  });

  it('should display the version of a saas platform registered in the Hub', () => {
    // Given a saas platform registered in the Hub
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows the version reported to the Hub
    expect(screen.getByText(VERSION)).toBeInTheDocument();
  });

  it('should display no version for a saas platform that is not registered in the Hub', () => {
    // Given a saas platform the Hub does not know
    mockSaasPlatforms([buildSaasPlatform({ registered_platform: null })]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows no version
    expect(screen.queryByText(VERSION)).not.toBeInTheDocument();
  });

  it('should display the database and file storage usages with their bars, the storage with an issue in alert color', () => {
    // Given a saas platform whose file storage is rated nearly full by the Hub
    // (the database one is not)
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then each usage shows its rounded percentage next to a bar, only the file storage ones in alert color
    const databaseBar = screen.getByRole('progressbar', {
      name: 'CSMBoard.Database',
    });
    const fileStorageBar = screen.getByRole('progressbar', {
      name: 'CSMBoard.FileStorage',
    });
    expect(databaseBar).toHaveAttribute(
      'aria-valuenow',
      String(DATABASE_USAGE_PERCENT)
    );
    expect(fileStorageBar).toHaveAttribute(
      'aria-valuenow',
      String(FILE_STORAGE_USAGE_PERCENT)
    );
    expect(databaseBar).not.toHaveClass(ALERT_PROGRESS_BAR_CLASS);
    expect(fileStorageBar).toHaveClass(ALERT_PROGRESS_BAR_CLASS);
    expect(screen.getByText('57%')).not.toHaveClass(
      'text-feedback-alert-primary'
    );
    expect(screen.getByText('93%')).toHaveClass('text-feedback-alert-primary');
  });

  it.each`
    availability | text         | health_issues                             | isMissed
    ${0.9996}    | ${'99.96%'}  | ${[SaasPlatformHealthIssue.Availability]} | ${true}
    ${0.9998}    | ${'99.98%'}  | ${[]}                                     | ${false}
    ${1}         | ${'100.00%'} | ${[]}                                     | ${false}
  `(
    'should display an availability of $text, in red: $isMissed',
    ({ availability, text, health_issues, isMissed }) => {
      // Given a saas platform with a known availability, rated by the Hub
      mockSaasPlatforms([
        buildSaasPlatform({ sla_cmtd: availability, health_issues }),
      ]);

      // When the list is rendered
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

      // Then its availability is shown, in red when the Hub rates the SLA missed
      const availabilityText = screen.getByText(text);
      if (isMissed) {
        expect(availabilityText).toHaveClass('text-feedback-error-primary');
      } else {
        expect(availabilityText).not.toHaveClass('text-feedback-error-primary');
      }
    }
  );

  it('should display no usage nor availability for a saas platform the SaaS Manager has no measure of', () => {
    // Given a saas platform without any storage usage nor availability
    mockSaasPlatforms([
      buildSaasPlatform({
        sla_cmtd: null,
        storage: { es_used_size: null, s3_used_size: { percent: null } },
        health_issues: null,
      }),
    ]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then no bar nor percentage is shown
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

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

    // Then its row shows no days left
    expect(screen.queryByText('CSMBoard.EndsIn')).not.toBeInTheDocument();
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
    ['CSMBoard.Health'],
    ['CSMBoard.Database'],
    ['CSMBoard.FileStorage'],
    ['CSMBoard.Availability'],
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

  it('should fetch the saas platforms of the product the user filters on', async () => {
    // Given the list of saas platforms
    mockSaasPlatforms([buildSaasPlatform()]);
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user filters on a product
    await user.click(
      screen.getByRole('combobox', { name: 'CSMBoard.Products' })
    );
    await user.click(screen.getByRole('option', { name: 'OpenAEV' }));

    // Then the saas platforms of that product are fetched
    expect(lastQueryVariables()).toMatchObject({
      product: SaasProduct.Oaev,
    });
  });

  it('should list the products to filter on, after every product', async () => {
    // Given the list of saas platforms
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user opens the product filter
    await user.click(
      screen.getByRole('combobox', { name: 'CSMBoard.Products' })
    );

    // Then every product the SaaS Manager can filter on is offered by its full name
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(['CSMBoard.AllProducts', 'OpenCTI', 'OpenAEV', 'XTM One']);
  });

  it('should fetch the saas platforms of every product again when the user picks all products', async () => {
    // Given a list filtered on a product
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
    const productFilter = screen.getByRole('combobox', {
      name: 'CSMBoard.Products',
    });
    await user.click(productFilter);
    await user.click(screen.getByRole('option', { name: 'OpenAEV' }));

    // When the user picks all products
    await user.click(productFilter);
    await user.click(
      screen.getByRole('option', { name: 'CSMBoard.AllProducts' })
    );

    // Then the saas platforms are fetched without product filter
    expect(lastQueryVariables()).toMatchObject({ product: null });
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

  it('should start the tour on its first step when the user opens the documentation', async () => {
    // Given the list of saas platforms
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user opens the documentation
    await user.click(
      screen.getByRole('button', { name: 'CSMBoard.Tour.Documentation' })
    );

    // Then the tour shows its first step
    expect(await screen.findByText('CSMBoard.Tour.Table')).toBeVisible();
  });

  it('should translate the navigation controls of the tour', async () => {
    // Given the list of saas platforms
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user opens the documentation
    await user.click(
      screen.getByRole('button', { name: 'CSMBoard.Tour.Documentation' })
    );

    // Then the previous, next and step buttons of the tour are labelled in the user's language
    expect(
      await screen.findByRole('button', { name: 'CSMBoard.Tour.PreviousStep' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'CSMBoard.Tour.NextStep' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'CSMBoard.Tour.GoToStep' })
    ).toHaveLength(
      getSaasListTourSteps(
        ((key: string) => key) as unknown as ReturnType<typeof useTranslate>
      ).length
    );
    expect(
      screen.queryByRole('button', { name: /^Go to/ })
    ).not.toBeInTheDocument();
  });

  it.each([
    [
      'the columns of the Hub',
      3,
      'CSMBoard.Tour.HubColumns',
      [SaasPlatformOrdering.Product, SaasPlatformOrdering.Plan],
    ],
    [
      'the columns with more information on hover',
      4,
      'CSMBoard.Tour.HoverDetails',
      [SaasPlatformOrdering.Plan, 'link'],
    ],
  ])(
    'should dim the columns in between on the step about %s',
    async (_, nextStepCount, stepContent, dimmedColumnIds) => {
      // Given the tour opened on the list of saas platforms
      mockSaasPlatforms([buildSaasPlatform()]);
      const { user, container } = renderWithCapabilities([
        PortalCapability.ReadSaasMetrics,
      ]);
      await user.click(
        screen.getByRole('button', { name: 'CSMBoard.Tour.Documentation' })
      );

      // When the user goes to the step
      for (let step = 0; step < nextStepCount; step++) {
        await user.click(
          screen.getByRole('button', { name: 'CSMBoard.Tour.NextStep' })
        );
      }
      await screen.findByText(stepContent);

      // Then the header and cell of each column in between are dimmed
      const list = container.querySelector('[data-tour="saas-list"]');
      expect(list).toHaveClass(
        ...dimmedColumnIds.map(
          (columnId) => `[&_[data-column-id=${columnId}]]:opacity-30`
        )
      );
      expect(
        list?.querySelectorAll(
          dimmedColumnIds
            .map((columnId) => `[data-column-id="${columnId}"]`)
            .join(', ')
        )
      ).toHaveLength(dimmedColumnIds.length * 2);
    }
  );

  it('should end the tour on the full documentation of the metrics', async () => {
    // Given the tour opened on the list of saas platforms
    mockSaasPlatforms([buildSaasPlatform()]);
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
    await user.click(
      screen.getByRole('button', { name: 'CSMBoard.Tour.Documentation' })
    );

    // When the user goes to the last step
    const stepCount = getSaasListTourSteps(
      ((key: string) => key) as unknown as ReturnType<typeof useTranslate>
    ).length;
    for (let step = 1; step < stepCount; step++) {
      await user.click(
        screen.getByRole('button', { name: 'CSMBoard.Tour.NextStep' })
      );
    }

    // Then the tour points to the full documentation
    expect(
      await screen.findByText('CSMBoard.Tour.FullDocumentation')
    ).toBeVisible();
  });

  it('should show the hidden columns the tour points at when the user opens the documentation', async () => {
    // Given a list whose customer column is hidden
    mockSaasPlatforms([buildSaasPlatform()]);
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
    await hideColumn(user, SaasPlatformOrdering.CustomerName);

    // When the user opens the documentation
    await user.click(
      screen.getByRole('button', { name: 'CSMBoard.Tour.Documentation' })
    );

    // Then the customer column is shown
    expect(getColumnHeader(SaasPlatformOrdering.CustomerName)).toBeVisible();
  });

  it('should hide again the columns the user had hidden when the tour closes', async () => {
    // Given the tour opened on a list whose customer column is hidden, which the tour shows
    mockSaasPlatforms([buildSaasPlatform()]);
    const { user } = renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
    await hideColumn(user, SaasPlatformOrdering.CustomerName);
    await user.click(
      screen.getByRole('button', { name: 'CSMBoard.Tour.Documentation' })
    );
    expect(getColumnHeader(SaasPlatformOrdering.CustomerName)).toBeVisible();

    // When the user closes the tour
    await user.click(
      await screen.findByRole('button', { name: 'CSMBoard.Tour.Close' })
    );

    // Then the customer column is hidden again
    await waitFor(() =>
      expect(getColumnHeader(SaasPlatformOrdering.CustomerName)).toBeNull()
    );
  });

  it('should find every element the tour points at in the list', () => {
    // Given a list with as many saas platforms as the tour highlights rows
    mockSaasPlatforms(
      Array.from({ length: HIGHLIGHTED_ROW_COUNT }, (_, index) =>
        buildSaasPlatform({ id: `platform-${index}` })
      )
    );
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the tour looks for the elements of its steps
    const steps = getSaasListTourSteps(
      ((key: string) => key) as unknown as ReturnType<typeof useTranslate>
    );
    const selectors = steps.flatMap((step) => [
      step.selector as string,
      ...(step.highlightedSelectors ?? []),
    ]);

    // Then each of them is in the list
    expect(
      selectors.filter((selector) => !document.querySelector(selector))
    ).toEqual([]);
  });
});
