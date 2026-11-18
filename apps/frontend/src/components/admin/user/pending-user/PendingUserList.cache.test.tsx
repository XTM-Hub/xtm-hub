import PendingUserList from '@/components/admin/user/pending-user/PendingUserList';
import { PendingUser } from '@/components/admin/user/pending-user/pending-user-list.types';
import { SelectionState } from '@/components/ui/data-table';
import { INVALIDATION_BATCH_MAX_WAIT_MS } from '@/hooks/use-batched-invalidation';
import testRender from '@/utils/test/test-render';
import {
  PendingUserAcceptDocument,
  PendingUserEventsSubscription,
  PendingUsersBulkAcceptDocument,
  PendingUsersDocument,
  PendingUsersQuery,
} from '@graphql/generated';
import { act, fireEvent, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  onPendingUserEvent: undefined as
    ((data: PendingUserEventsSubscription) => void) | undefined,
}));

// The real queries and mutations run, against a mocked network.
vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { request: mocks.request },
}));

// The events are sent by the test.
vi.mock('@/hooks/use-graphql-subscription', () => ({
  useGraphqlSubscription: (
    _document: string,
    _variables: unknown,
    { onNext }: { onNext: (data: PendingUserEventsSubscription) => void }
  ) => {
    mocks.onPendingUserEvent = onNext;
  },
}));

vi.mock('@/components/admin/user/forms/AddUser', () => ({
  AddUser: () => null,
}));

// The table is not under test: it shows the actions of each row, and those of
// a selection of the first pending user.
vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({
    columns,
    data,
    selectionOptions,
  }: {
    columns: Array<{
      id?: string;
      cell?: (props: { row: { original: PendingUser } }) => ReactNode;
    }>;
    data: PendingUser[];
    selectionOptions?: {
      selectionHeader?: {
        actions?: (props: { selectionState: SelectionState }) => ReactNode;
      };
    };
  }) => {
    const actionColumn = columns.find((column) => column.id === 'actions');
    return (
      <div>
        {data.map((row) => (
          <div
            key={row.id}
            data-testid={`row-${row.id}`}>
            <span>{row.email}</span>
            {actionColumn?.cell?.({ row: { original: row } })}
          </div>
        ))}
        <div data-testid="selection-header">
          {selectionOptions?.selectionHeader?.actions?.({
            selectionState: SELECTION,
          })}
        </div>
      </div>
    );
  },
  DataTableHeadBarOptions: () => null,
}));

// The organization selected by the user testRender provides.
const ORGANIZATION_ID = 'org-test-456';
const DELETION_EVENTS_COUNT = 20;
const APPROVE_LABEL = 'PendingUserListPage.Approve';
const APPROVE_CONFIRM = 'PendingUserListPage.WarningUserAccept.Confirm';
const BULK_APPROVE_CONFIRM = 'PendingUserListPage.WarningUsersAccept.Confirm';

const PENDING_USER: PendingUser = {
  id: 'pending-1',
  email: 'first.pending@filigran.io',
  first_name: 'First',
  last_name: 'Pending',
};

const SELECTION: SelectionState = {
  selectAll: false,
  selectedIds: new Set([PENDING_USER.id]),
  excludedIds: new Set(),
};

const PENDING_USERS: PendingUsersQuery = {
  pendingUsers: { totalCount: 1, edges: [{ node: PENDING_USER }] },
};

const RESPONSES: Record<string, unknown> = {
  [PendingUsersDocument]: PENDING_USERS,
  [PendingUserAcceptDocument]: {
    acceptPendingUserInOrganization: { id: PENDING_USER.id },
  },
  [PendingUsersBulkAcceptDocument]: {
    bulkAcceptPendingUserInOrganization: { success: true },
  },
};

const pendingUsersRequestsCount = () =>
  mocks.request.mock.calls.filter(
    ([{ document }]) => document === PendingUsersDocument
  ).length;

const wasSent = (document: string) =>
  mocks.request.mock.calls.some(([request]) => request.document === document);

const sendDeletionEvents = (count: number) =>
  act(() => {
    for (let event = 0; event < count; event += 1) {
      mocks.onPendingUserEvent!({
        UserPending: { delete: { id: `pending-user-${event}` } },
      });
    }
  });

const runPendingTimers = () =>
  act(() => vi.advanceTimersByTimeAsync(INVALIDATION_BATCH_MAX_WAIT_MS));

// The fake timers are moved by vi only: findBy and user-event would rely on
// the global jest object, which only the Relay test utilities provide.
const settleRequests = () => act(() => vi.advanceTimersByTimeAsync(0));

const renderLoadedList = async () => {
  testRender(<PendingUserList organization={ORGANIZATION_ID} />);
  await vi.waitFor(() =>
    expect(screen.getByText(PENDING_USER.email)).toBeInTheDocument()
  );
  expect(pendingUsersRequestsCount()).toBe(1);
};

describe('PendingUserList cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.request.mockImplementation(({ document }: { document: string }) =>
      Promise.resolve(RESPONSES[document])
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reload the pending users once when a bulk accept is followed by the deletion of each accepted user', async () => {
    // Given
    await renderLoadedList();
    fireEvent.click(
      within(screen.getByTestId('selection-header')).getByRole('button', {
        name: APPROVE_LABEL,
      })
    );

    // When
    fireEvent.click(screen.getByRole('button', { name: BULK_APPROVE_CONFIRM }));
    await settleRequests();
    sendDeletionEvents(DELETION_EVENTS_COUNT);
    await runPendingTimers();

    // Then
    expect(wasSent(PendingUsersBulkAcceptDocument)).toBe(true);
    expect(pendingUsersRequestsCount()).toBe(2);
  });

  it('should reload the pending users once when a single accept is followed by its deletion event', async () => {
    // Given
    await renderLoadedList();
    fireEvent.click(
      within(screen.getByTestId(`row-${PENDING_USER.id}`)).getByRole('button', {
        name: APPROVE_LABEL,
      })
    );

    // When
    fireEvent.click(screen.getByRole('button', { name: APPROVE_CONFIRM }));
    await settleRequests();
    sendDeletionEvents(1);
    await runPendingTimers();

    // Then
    expect(wasSent(PendingUserAcceptDocument)).toBe(true);
    expect(pendingUsersRequestsCount()).toBe(2);
  });
});
