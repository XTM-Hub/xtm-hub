import TrialsTab from '@/components/trials/tab/TrialsTab';
import { useTrialsListLocalstorage } from '@/components/trials/trial-list-localstorage';
import {
  TRIALS_TAB_CONFIG,
  TrialsTabType,
} from '@/components/trials/trials.const';
import { DEBOUNCE_TIME } from '@/utils/constant';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestHubStatus,
  DeploymentRequestOrdering,
  DeploymentRequestPlatformRegion,
  OrderingMode,
  PlatformIdentifier,
  PortalCapability,
  TrialsListQuery,
  TrialsProductFragment,
  TrialsRowFragment,
} from '@graphql/generated';
import { act, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TRIAL_ID = 'trial-1';
const REQUESTER_EMAIL = 'requester@acme.io';
const ORGANIZATION_NAME = 'ACME';
const SEARCH_TERM = 'acme';
const OPENCTI_LABEL = 'OPENCTI';
const XTMONE_LABEL = 'XTMONE';
const PLATFORM_ID = 'opencti-platform-id';
const PLATFORM_URL = 'opencti.acme.io';
const PRODUCT_URL = 'opencti.filigran.io';
const NOW = new Date('2026-06-10T12:00:00');
const CANCELLATION_DATE = '2026-06-08T12:00:00';
const CANCELLATION_USER_EMAIL = 'admin@filigran.io';
const END_DATE = '2026-06-15T12:00:00';
const DAYS_BEFORE_END = '5';
const CANCELLATION_REASON = 'value';
const PLATFORM_URL_COLUMN = 'TrialsDashboard.Columns.PlatformUrl';
const REGISTRATION_STATUS_COLUMN = 'TrialsDashboard.Columns.RegistrationStatus';
const REMAINING_DAYS_COLUMN = 'TrialsDashboard.Columns.RemainingDays';
const EMAIL_HEADER = 'TrialsDashboard.Columns.Email';
const CANCEL_LABEL = 'TrialsDashboard.Actions.CancelBundle';
const MANAGE_USERS_LABEL = 'Service.Trials.ManageUsers.Title';

const mocks = vi.hoisted(() => ({
  useTrialsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useTrialsListQuery: mocks.useTrialsListQuery,
  });
});

const makeProduct = (
  overrides: Partial<TrialsProductFragment> = {}
): TrialsProductFragment => ({
  id: `product-${overrides.platform_identifier ?? PlatformIdentifier.Opencti}`,
  platform_identifier: PlatformIdentifier.Opencti,
  hub_status: DeploymentRequestHubStatus.Active,
  platform_id: null,
  platform_url: null,
  url: null,
  ...overrides,
});

const makeTrial = (
  overrides: Partial<TrialsRowFragment> = {}
): TrialsRowFragment => ({
  id: TRIAL_ID,
  service_instance_id: 'service-instance-1',
  ordering: 1,
  hub_status: DeploymentRequestHubStatus.Active,
  requester_email: REQUESTER_EMAIL,
  organization_name: ORGANIZATION_NAME,
  region: DeploymentRequestPlatformRegion.EuWest,
  request_date: '2026-06-01T12:00:00',
  start_date: '2026-06-02T12:00:00',
  end_date: END_DATE,
  cancellation_date: null,
  cancellation_user_email: null,
  cancellation_reason: null,
  children: [],
  ...overrides,
});

const makeQueuedTrial = (): TrialsRowFragment =>
  makeTrial({
    hub_status: DeploymentRequestHubStatus.Queued,
    start_date: null,
    end_date: null,
  });

const makePendingTrial = (): TrialsRowFragment =>
  makeTrial({
    hub_status: DeploymentRequestHubStatus.Pending,
    start_date: null,
    end_date: null,
  });

const makeCancelledTrial = (
  cancellationReason: string | null
): TrialsRowFragment =>
  makeTrial({
    hub_status: DeploymentRequestHubStatus.Cancelled,
    cancellation_date: CANCELLATION_DATE,
    cancellation_user_email: CANCELLATION_USER_EMAIL,
    cancellation_reason: cancellationReason,
  });

const mockTrials = (trials: TrialsRowFragment[]) => {
  const data: TrialsListQuery = {
    deploymentRequestsList: {
      totalCount: trials.length,
      edges: trials.map((node) => ({ node })),
    },
  };
  mocks.useTrialsListQuery.mockReturnValue({ data });
};

const lastRequestedVariables = () =>
  mocks.useTrialsListQuery.mock.lastCall?.[1];

const showAllColumns = (type: TrialsTabType) => {
  const { result, unmount } = renderHook(() =>
    useTrialsListLocalstorage(
      [],
      type,
      TRIALS_TAB_CONFIG[type].defaultOrder,
      TRIALS_TAB_CONFIG[type].defaultOrderMode
    )
  );
  act(() => result.current.setColumnVisibility({}));
  unmount();
};

const getTrialRow = () => {
  const row = screen.getByText(REQUESTER_EMAIL).closest('tr');
  if (!row) {
    throw new Error(`No table row holds ${REQUESTER_EMAIL}`);
  }
  return row;
};

const getCell = (column: string) => {
  const columnIndex = screen
    .getAllByRole('columnheader')
    .findIndex((header) => within(header).queryByText(column));
  if (columnIndex === -1) {
    throw new Error(`No column header holds ${column}`);
  }
  return within(getTrialRow()).getAllByRole('cell')[columnIndex];
};

describe('TrialsTab', () => {
  beforeEach(() => {
    mockTrials([makeTrial()]);
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it.each([
    {
      type: TrialsTabType.Waiting,
      orderBy: DeploymentRequestOrdering.Ordering,
      orderMode: OrderingMode.Asc,
    },
    {
      type: TrialsTabType.Running,
      orderBy: DeploymentRequestOrdering.RequestDate,
      orderMode: OrderingMode.Desc,
    },
    {
      type: TrialsTabType.Expired,
      orderBy: DeploymentRequestOrdering.RequestDate,
      orderMode: OrderingMode.Desc,
    },
    {
      type: TrialsTabType.Cancelled,
      orderBy: DeploymentRequestOrdering.RequestDate,
      orderMode: OrderingMode.Desc,
    },
  ])(
    'should request the trials by $orderBy $orderMode when the $type tab opens',
    ({ type, orderBy, orderMode }) => {
      // Given / When
      testRender(<TrialsTab type={type} />);

      // Then
      expect(lastRequestedVariables()).toMatchObject({ orderBy, orderMode });
    }
  );

  it('should search the trials matching the term when the admin types it', async () => {
    // Given
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    testRender(<TrialsTab type={TrialsTabType.Running} />);

    // When
    await user.type(
      screen.getByRole('searchbox', {
        name: 'TrialsDashboard.Actions.SearchTrials',
      }),
      SEARCH_TERM
    );
    act(() => vi.advanceTimersByTime(DEBOUNCE_TIME));

    // Then
    expect(lastRequestedVariables()).toMatchObject({
      searchTerm: SEARCH_TERM,
    });
  });

  it('should sort the waiting trials by the clicked column when the user cannot reorder the queue', async () => {
    // Given
    mockTrials([makeQueuedTrial()]);
    const { user } = testRender(<TrialsTab type={TrialsTabType.Waiting} />);

    // When
    await user.click(screen.getByText(EMAIL_HEADER));

    // Then
    expect(lastRequestedVariables()).toMatchObject({
      orderBy: DeploymentRequestOrdering.RequesterEmail,
      orderMode: OrderingMode.Asc,
    });
  });

  it('should keep the queue order when the admin who can reorder it clicks a column', async () => {
    // Given
    mockTrials([makeQueuedTrial()]);
    const { user } = testRender(<TrialsTab type={TrialsTabType.Waiting} />, {
      me: { capabilities: [{ name: PortalCapability.ModifyTrials }] },
    });

    // When
    await user.click(screen.getByText(EMAIL_HEADER));

    // Then
    expect(lastRequestedVariables()).toMatchObject({
      orderBy: DeploymentRequestOrdering.Ordering,
    });
  });

  it('should offer to cancel a running trial when the user can modify trials', () => {
    // Given / When
    testRender(<TrialsTab type={TrialsTabType.Running} />, {
      me: { capabilities: [{ name: PortalCapability.ModifyTrials }] },
    });

    // Then
    expect(
      screen.getByRole('button', { name: CANCEL_LABEL })
    ).toBeInTheDocument();
  });

  it('should not offer to cancel a running trial when the user cannot modify trials', () => {
    // Given / When
    testRender(<TrialsTab type={TrialsTabType.Running} />);

    // Then
    expect(
      within(getTrialRow()).queryByRole('button', { name: CANCEL_LABEL })
    ).not.toBeInTheDocument();
  });

  it('should link to the users of a running trial when the admin can bypass the capabilities', () => {
    // Given / When
    testRender(<TrialsTab type={TrialsTabType.Running} />, {
      me: { capabilities: [{ name: PortalCapability.Bypass }] },
    });

    // Then
    expect(
      screen.getByRole('link', { name: MANAGE_USERS_LABEL })
    ).toBeInTheDocument();
  });

  it.each([
    { column: 'TrialsDashboard.Columns.EndDate' },
    { column: REMAINING_DAYS_COLUMN },
  ])(
    'should show a dash in $column when a running trial has no end date yet',
    ({ column }) => {
      // Given
      mockTrials([makePendingTrial()]);

      // When
      testRender(<TrialsTab type={TrialsTabType.Running} />);

      // Then
      expect(getCell(column).textContent).toBe('-');
    }
  );

  it('should show the days left before the end of a running trial when it has an end date', () => {
    // Given
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);

    // When
    testRender(<TrialsTab type={TrialsTabType.Running} />);

    // Then
    expect(getCell(REMAINING_DAYS_COLUMN).textContent).toBe(DAYS_BEFORE_END);
  });

  it.each([
    { context: 'no reason was given', reason: null, expected: '-' },
    {
      context: 'a reason was picked',
      reason: CANCELLATION_REASON,
      expected: `Service.Trials.CancellationReason.${CANCELLATION_REASON}`,
    },
  ])(
    'should show the cancellation reason of a cancelled trial when $context',
    ({ reason, expected }) => {
      // Given
      mockTrials([makeCancelledTrial(reason)]);

      // When
      testRender(<TrialsTab type={TrialsTabType.Cancelled} />);

      // Then
      expect(
        getCell('TrialsDashboard.Columns.CancellationReason').textContent
      ).toBe(expected);
    }
  );

  it.each([
    {
      context: 'the product is registered',
      column: 'TrialsDashboard.Columns.PlatformId',
      product: makeProduct({ platform_id: PLATFORM_ID }),
      expected: PLATFORM_ID,
    },
    {
      context: 'the platform has a url',
      column: PLATFORM_URL_COLUMN,
      product: makeProduct({ platform_url: PLATFORM_URL, url: PRODUCT_URL }),
      expected: PLATFORM_URL,
    },
    {
      context: 'only the product has a url',
      column: PLATFORM_URL_COLUMN,
      product: makeProduct({ url: PRODUCT_URL }),
      expected: PRODUCT_URL,
    },
    {
      context: 'the product is registered',
      column: REGISTRATION_STATUS_COLUMN,
      product: makeProduct({ platform_id: PLATFORM_ID }),
      expected: 'TrialsDashboard.Registered',
    },
    {
      context: 'the product is not registered yet',
      column: REGISTRATION_STATUS_COLUMN,
      product: makeProduct(),
      expected: 'TrialsDashboard.NotRegistered',
    },
  ])(
    'should show $expected in $column when $context',
    ({ column, product, expected }) => {
      // Given
      showAllColumns(TrialsTabType.Running);
      mockTrials([makeTrial({ children: [product] })]);

      // When
      testRender(<TrialsTab type={TrialsTabType.Running} />);

      // Then
      expect(getCell(column).textContent).toBe(`${OPENCTI_LABEL}${expected}`);
    }
  );

  it('should list the products in the product order when a trial has several', () => {
    // Given
    mockTrials([
      makeTrial({
        children: [
          makeProduct({ platform_identifier: PlatformIdentifier.Xtmone }),
          makeProduct({ platform_identifier: PlatformIdentifier.Opencti }),
        ],
      }),
    ]);

    // When
    testRender(<TrialsTab type={TrialsTabType.Running} />);

    // Then
    expect(getCell('TrialsDashboard.Columns.Products').textContent).toBe(
      `${OPENCTI_LABEL}${XTMONE_LABEL}`
    );
  });
});
