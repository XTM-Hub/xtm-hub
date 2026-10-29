import { SaasList } from '@/components/subcription/saas/SaasList';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  PortalCapability,
  SaasPlatformContractStatus,
  SaasPlatformHealthIssue,
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

const mockTranslationsWithValues = () =>
  vi
    .mocked(useTranslations)
    .mockReturnValue(((key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key) as ReturnType<
      typeof useTranslations
    >);

// The tone of a chip is painted on its root, around the label
const getChipByLabel = (label: string) =>
  screen.getByText(label).closest('[class*="bg-feedback-"]');

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

  it('should display the version of a saas platform registered in the Hub in a tooltip on its product', async () => {
    // Given a saas platform registered in the Hub
    mockTranslationsWithValues();
    mockSaasPlatforms([buildSaasPlatform()]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user focuses its product
    fireEvent.focus(screen.getByText(PRODUCT_NAME));

    // Then a tooltip shows the version reported to the Hub
    const tooltip = await screen.findByRole('tooltip');
    expect(
      within(tooltip).getByText(
        `CSMBoard.ProductVersion:${JSON.stringify({ version: VERSION })}`
      )
    ).toBeInTheDocument();
  });

  it('should display no version tooltip on the product of a saas platform that is not registered in the Hub', () => {
    // Given a saas platform the Hub does not know
    mockSaasPlatforms([buildSaasPlatform({ registered_platform: null })]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user focuses its product
    fireEvent.focus(screen.getByText(PRODUCT_NAME));

    // Then no tooltip opens
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should display the version of a saas platform registered in the Hub', () => {
    // Given a saas platform registered in the Hub
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row shows the version reported to the Hub
    expect(screen.getByText(VERSION)).toBeInTheDocument();
  });

  it('should display the exact contract end date in a tooltip on the days left', async () => {
    // Given a saas platform with a contract end date
    mockSaasPlatforms([buildSaasPlatform()]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);
    expect(screen.queryByText('Mar 15, 2027')).not.toBeInTheDocument();

    // When the user focuses the days left of its contract
    fireEvent.focus(screen.getByText('CSMBoard.EndsIn'));

    // Then a tooltip shows the exact end date
    const tooltip = await screen.findByRole('tooltip');
    expect(within(tooltip).getByText('Mar 15, 2027')).toBeInTheDocument();
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
    description               | endDate                       | contractStatus                           | days  | className
    ${'in 90 days or more'}   | ${'2027-01-26T12:00:00.000Z'} | ${SaasPlatformContractStatus.Active}     | ${90} | ${'text-default-secondary'}
    ${'in less than 90 days'} | ${'2027-01-25T12:00:00.000Z'} | ${SaasPlatformContractStatus.EndingSoon} | ${89} | ${'text-feedback-warning-primary'}
  `(
    'should display the $days days left on a contract that ends $description in $className',
    ({ endDate, contractStatus, days, className }) => {
      // Given a saas platform whose contract ends at a known date from now
      vi.useFakeTimers({
        toFake: ['Date'],
        now: new Date('2026-10-28T12:00:00.000Z'),
      });
      mockTranslationsWithValues();
      mockSaasPlatforms([
        buildSaasPlatform({
          metadata: {
            plan: PLAN,
            end_date: endDate,
          },
          contract_status: contractStatus,
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

  it('should display an ended contract as ended, in red, with its end date in a tooltip', async () => {
    // Given a saas platform whose contract ended 40 days ago
    mockSaasPlatforms([
      buildSaasPlatform({
        metadata: { plan: PLAN, end_date: '2026-09-18T12:00:00.000Z' },
        contract_status: SaasPlatformContractStatus.Ended,
      }),
    ]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user focuses its contract end
    const contractEnd = screen.getByText('CSMBoard.ContractEnded');
    fireEvent.focus(contractEnd);

    // Then it reads ended, in red, not as days left, and the tooltip shows its date
    expect(contractEnd).toHaveClass('text-feedback-error-primary');
    expect(screen.queryByText(/^CSMBoard\.EndsIn/)).not.toBeInTheDocument();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
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

  it('should display a green health chip for a saas platform without any issue', () => {
    // Given a saas platform whose availability and storages are all fine
    mockSaasPlatforms([
      buildSaasPlatform({
        sla_cmtd: 1,
        storage: {
          es_used_size: { percent: DATABASE_USAGE_PERCENT },
          s3_used_size: { percent: DATABASE_USAGE_PERCENT },
        },
        health_issues: [],
      }),
    ]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its health is a green chip
    expect(getChipByLabel('CSMBoard.Healthy')).toHaveClass(
      'bg-feedback-success-secondary-transparency-30'
    );
  });

  it.each`
    description                         | overrides                                                                                                                                        | label                                             | className
    ${'misses its SLA'}                 | ${{ storage: { es_used_size: { percent: 12 }, s3_used_size: { percent: 12 } }, health_issues: [SaasPlatformHealthIssue.Availability] }}          | ${'CSMBoard.HealthSla:{"percent":"99.96%"}'}      | ${'bg-feedback-error-secondary-transparency-30'}
    ${'has a nearly full database'}     | ${{ sla_cmtd: 1, storage: { es_used_size: { percent: 85 }, s3_used_size: { percent: 12 } }, health_issues: [SaasPlatformHealthIssue.Database] }} | ${'CSMBoard.HealthDatabase:{"percent":"85%"}'}    | ${'bg-feedback-alert-secondary-transparency-30'}
    ${'has a nearly full file storage'} | ${{ sla_cmtd: 1, health_issues: [SaasPlatformHealthIssue.FileStorage] }}                                                                         | ${'CSMBoard.HealthFileStorage:{"percent":"93%"}'} | ${'bg-feedback-alert-secondary-transparency-30'}
  `(
    'should display a health chip naming the issue of a saas platform that $description',
    ({ overrides, label, className }) => {
      // Given a saas platform with a single issue
      mockTranslationsWithValues();
      mockSaasPlatforms([buildSaasPlatform(overrides)]);

      // When the list is rendered
      renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

      // Then its health chip names the measure and its value, in the tone of the issue
      expect(getChipByLabel(label)).toHaveClass(className);
      expect(screen.queryByText('CSMBoard.Healthy')).not.toBeInTheDocument();
    }
  );

  it('should display the most severe health issue with the count of the others, listed in a tooltip', async () => {
    // Given a saas platform that misses its SLA and whose storages are nearly full
    mockTranslationsWithValues();
    mockSaasPlatforms([
      buildSaasPlatform({
        storage: {
          es_used_size: { percent: 85 },
          s3_used_size: { percent: FILE_STORAGE_USAGE_PERCENT },
        },
        health_issues: [
          SaasPlatformHealthIssue.Availability,
          SaasPlatformHealthIssue.Database,
          SaasPlatformHealthIssue.FileStorage,
        ],
      }),
    ]);
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // When the user focuses its health chip
    const chipLabel = 'CSMBoard.HealthSla:{"percent":"99.96%"} +2';
    expect(getChipByLabel(chipLabel)).toHaveClass(
      'bg-feedback-error-secondary-transparency-30'
    );
    fireEvent.focus(getChipByLabel(chipLabel)!);

    // Then a tooltip lists the other issues
    const tooltip = await screen.findByRole('tooltip');
    for (const label of [
      'CSMBoard.HealthDatabase:{"percent":"85%"}',
      'CSMBoard.HealthFileStorage:{"percent":"93%"}',
    ]) {
      expect(within(tooltip).getByText(label)).toBeInTheDocument();
    }
  });

  it('should display no health for a saas platform the SaaS Manager has no measure of', () => {
    // Given a saas platform without any storage usage nor availability
    mockSaasPlatforms([
      buildSaasPlatform({ sla_cmtd: null, storage: null, health_issues: null }),
    ]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then no health chip is shown
    expect(
      screen.queryByText(/^CSMBoard\.Health(y|Sla|Database|FileStorage)/)
    ).not.toBeInTheDocument();
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

  it('should display the logo and the metrics link of a saas platform registered in the Hub', () => {
    // Given a saas platform registered in the Hub
    mockSaasPlatforms([buildSaasPlatform()]);

    // When the list is rendered
    renderWithCapabilities([PortalCapability.ReadSaasMetrics]);

    // Then its row links to the metrics page of its service instance, opened from the CSM board, after the logo of its product
    const link = screen.getByRole('link', { name: 'CSMBoard.ViewMetrics' });
    expect(link).toHaveAttribute(
      'href',
      `/app/service/opencti_registration/${SERVICE_INSTANCE_ID}?from=csm-board`
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
