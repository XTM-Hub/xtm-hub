import {
  AcceptPendingUserBulkMutation,
  AcceptPendingUserMutation,
  RemovePendingUserBulkMutation,
  RemovePendingUserMutation,
} from '@/components/admin/user/pending-user/pending-user.graphql';
import { SelectionState } from '@/components/ui/data-table';
import { PendingUserListAcceptUserMutation$data } from '@generated/PendingUserListAcceptUserMutation.graphql';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { FilterKey } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { useMutation } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePendingUserActions } from './use-pending-user-actions';

const mocks = vi.hoisted(() => ({
  showSnackbar: vi.fn(),
  approveCommit: vi.fn(),
  rejectCommit: vi.fn(),
  bulkApproveCommit: vi.fn(),
  bulkRejectCommit: vi.fn(),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useMutation: vi.fn(),
}));

const pendingUser = {
  id: 'pending-user-id',
  email: 'pending.user@filigran.io',
  first_name: 'Pending',
  last_name: 'User',
} as UserList_fragment$data;

interface RelayMutationConfig<TResponse> {
  variables: Record<string, unknown>;
  onCompleted: (response: TResponse) => void;
  onError: (error: Error) => void;
}

const getMutationConfig = <TResponse>(
  commit: (typeof mocks)['approveCommit'],
  callIndex = 0
) =>
  commit.mock.calls[
    callIndex
  ]?.[0] as unknown as RelayMutationConfig<TResponse>;

describe('usePendingUserActions', () => {
  const onAfterSingleMutation = vi.fn();
  const onAfterBulkMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTranslations).mockReturnValue((key, values) =>
      values?.email ? `${key}:${values.email}` : key
    );
    vi.mocked(useMutation).mockImplementation(((mutation: unknown) => {
      switch (mutation) {
        case AcceptPendingUserMutation:
          return [mocks.approveCommit, false];
        case RemovePendingUserMutation:
          return [mocks.rejectCommit, false];
        case AcceptPendingUserBulkMutation:
          return [mocks.bulkApproveCommit, false];
        case RemovePendingUserBulkMutation:
          return [mocks.bulkRejectCommit, false];
        default:
          throw new Error('Unexpected mutation');
      }
    }) as never);
  });

  const renderActions = (searchTerm?: string) =>
    renderHook(() =>
      usePendingUserActions({
        organization: 'org-1',
        selectedOrganizationId: 'selected-org-id',
        searchTerm,
        onAfterSingleMutation,
        onAfterBulkMutation,
      })
    );

  it('approves a single pending user with expected variables and success toast', () => {
    const { result } = renderActions('john');

    act(() => {
      result.current.approveUser(pendingUser);
    });

    expect(mocks.approveCommit).toHaveBeenCalledOnce();

    const config = getMutationConfig<PendingUserListAcceptUserMutation$data>(
      mocks.approveCommit
    );
    expect(config.variables).toEqual({
      user_id: 'pending-user-id',
      organization_id: 'selected-org-id',
    });

    act(() => {
      config.onCompleted({
        acceptPendingUserInOrganization: { __fragments: {} },
      } as unknown as PendingUserListAcceptUserMutation$data);
    });

    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'success',
      title: 'Utils.Success',
      description: `PendingUserListPage.ActionSuccessApprove:${pendingUser.email}`,
    });
    expect(onAfterSingleMutation).toHaveBeenCalledOnce();
  });

  it('does not show a success toast when approve mutation returns null payload', () => {
    const { result } = renderActions();

    act(() => {
      result.current.approveUser(pendingUser);
    });

    const config = getMutationConfig<PendingUserListAcceptUserMutation$data>(
      mocks.approveCommit
    );

    act(() => {
      config.onCompleted({
        acceptPendingUserInOrganization: null,
      } as PendingUserListAcceptUserMutation$data);
    });

    expect(mocks.showSnackbar).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Utils.Success',
      })
    );
    expect(onAfterSingleMutation).not.toHaveBeenCalled();
  });

  it('rejects a single pending user and handles mutation errors with destructive toast', () => {
    const { result } = renderActions();

    act(() => {
      result.current.rejectUser(pendingUser);
    });

    const config = getMutationConfig<unknown>(mocks.rejectCommit);
    expect(config.variables).toEqual({
      user_id: 'pending-user-id',
      organization_id: 'selected-org-id',
    });

    act(() => {
      config.onCompleted({});
    });

    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'success',
      title: 'Utils.Success',
      description: `PendingUserListPage.ActionSuccessDeny:${pendingUser.email}`,
    });

    act(() => {
      config.onError(new Error('Boom'));
    });

    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'error',
      title: 'Utils.Error',
      description: 'Error.Server.Boom',
    });
  });

  it('falls back to UnknownError when the mutation error has no message', () => {
    const { result } = renderActions();

    act(() => {
      result.current.rejectUser(pendingUser);
    });

    const config = getMutationConfig<unknown>(mocks.rejectCommit);

    act(() => {
      config.onError(new Error(''));
    });

    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'error',
      title: 'Utils.Error',
      description: 'Error.Server.UnknownError',
    });
  });

  it('uses selectedIds path for bulk approve mutations', () => {
    const { result } = renderActions('john');

    const selectionState: SelectionState = {
      selectAll: false,
      selectedIds: new Set(['user-1', 'user-2']),
      excludedIds: new Set(),
    };

    act(() => {
      result.current.handleBulkApprove(selectionState);
    });

    expect(mocks.bulkApproveCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          ids: ['user-1', 'user-2'],
          searchTerm: undefined,
          filters: [],
          excludedIds: [],
        },
        onCompleted: onAfterBulkMutation,
      })
    );
  });

  it('uses selectAll path for bulk reject mutations with filters/search/excludedIds', () => {
    const { result } = renderActions('pending');

    const selectionState: SelectionState = {
      selectAll: true,
      selectedIds: new Set(),
      excludedIds: new Set(['user-3']),
    };

    act(() => {
      result.current.handleBulkReject(selectionState);
    });

    expect(mocks.bulkRejectCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          ids: [],
          searchTerm: 'pending',
          filters: [{ key: FilterKey.OrganizationId, value: ['org-1'] }],
          excludedIds: ['user-3'],
        },
        onCompleted: onAfterBulkMutation,
      })
    );
  });
});
