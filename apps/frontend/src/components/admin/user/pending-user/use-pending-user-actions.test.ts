import { PendingUser } from '@/components/admin/user/pending-user/pending-user-list.types';
import { SelectionState } from '@/components/ui/data-table';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import { FilterKey, PendingUserAcceptMutation } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePendingUserActions } from './use-pending-user-actions';

const ORGANIZATION_ID = 'org-1';
const SELECTED_ORGANIZATION_ID = 'selected-org-id';
const SERVER_ERROR_CODE = 'Boom';

const mocks = vi.hoisted(() => ({
  showSnackbar: vi.fn(),
  usePendingUserAcceptMutation: vi.fn(),
  usePendingUserRemoveMutation: vi.fn(),
  usePendingUsersBulkAcceptMutation: vi.fn(),
  usePendingUsersBulkRemoveMutation: vi.fn(),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  usePendingUserAcceptMutation: mocks.usePendingUserAcceptMutation,
  usePendingUserRemoveMutation: mocks.usePendingUserRemoveMutation,
  usePendingUsersBulkAcceptMutation: mocks.usePendingUsersBulkAcceptMutation,
  usePendingUsersBulkRemoveMutation: mocks.usePendingUsersBulkRemoveMutation,
}));

const pendingUser: PendingUser = {
  id: 'pending-user-id',
  email: 'pending.user@filigran.io',
  first_name: 'Pending',
  last_name: 'User',
};

const ACCEPTED: PendingUserAcceptMutation = {
  acceptPendingUserInOrganization: { id: pendingUser.id },
};

const ERROR_SNACKBAR = {
  severity: 'error',
  title: 'Utils.Error',
  description: `Error.Server.${SERVER_ERROR_CODE}`,
};

const SELECTED_USERS: SelectionState = {
  selectAll: false,
  selectedIds: new Set(['user-1', 'user-2']),
  excludedIds: new Set(),
};

describe('usePendingUserActions', () => {
  const onAfterSingleMutation = vi.fn();
  const onAfterBulkMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTranslations).mockReturnValue((key, values) =>
      values?.email ? `${key}:${values.email}` : key
    );
    // Every mutation succeeds unless a test says otherwise.
    mockMutationHook(mocks.usePendingUserAcceptMutation, 'success', {
      data: ACCEPTED,
    });
    mockMutationHook(mocks.usePendingUserRemoveMutation, 'success');
    mockMutationHook(mocks.usePendingUsersBulkAcceptMutation, 'success');
    mockMutationHook(mocks.usePendingUsersBulkRemoveMutation, 'success');
  });

  const renderActions = (searchTerm?: string) =>
    renderHook(() =>
      usePendingUserActions({
        organization: ORGANIZATION_ID,
        selectedOrganizationId: SELECTED_ORGANIZATION_ID,
        searchTerm,
        onAfterSingleMutation,
        onAfterBulkMutation,
      })
    );

  it('approves a single pending user with expected variables and success toast', async () => {
    const approveMutate = mockMutationHook(
      mocks.usePendingUserAcceptMutation,
      'success',
      { data: ACCEPTED }
    );
    const { result } = renderActions('john');

    await act(async () => {
      result.current.approveUser(pendingUser);
    });

    expect(approveMutate).toHaveBeenCalledExactlyOnceWith({
      user_id: pendingUser.id,
      organization_id: SELECTED_ORGANIZATION_ID,
    });
    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'success',
      title: 'Utils.Success',
      description: `PendingUserListPage.ActionSuccessApprove:${pendingUser.email}`,
    });
    expect(onAfterSingleMutation).toHaveBeenCalledOnce();
  });

  it('does not show a success toast when approve mutation returns null payload', async () => {
    mockMutationHook(mocks.usePendingUserAcceptMutation, 'success', {
      data: { acceptPendingUserInOrganization: null },
    });
    const { result } = renderActions();

    await act(async () => {
      result.current.approveUser(pendingUser);
    });

    expect(mocks.showSnackbar).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Utils.Success',
      })
    );
    expect(onAfterSingleMutation).not.toHaveBeenCalled();
  });

  it('rejects a single pending user and handles mutation errors with destructive toast', async () => {
    const rejectMutate = mockMutationHook(
      mocks.usePendingUserRemoveMutation,
      'success'
    );
    const { result } = renderActions();

    await act(async () => {
      result.current.rejectUser(pendingUser);
    });

    expect(rejectMutate).toHaveBeenCalledExactlyOnceWith({
      user_id: pendingUser.id,
      organization_id: SELECTED_ORGANIZATION_ID,
    });
    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'success',
      title: 'Utils.Success',
      description: `PendingUserListPage.ActionSuccessDeny:${pendingUser.email}`,
    });

    mockMutationHook(mocks.usePendingUserRemoveMutation, 'error', {
      error: new Error(SERVER_ERROR_CODE),
    });
    const { result: failingResult } = renderActions();

    await act(async () => {
      failingResult.current.rejectUser(pendingUser);
    });

    expect(mocks.showSnackbar).toHaveBeenCalledWith(ERROR_SNACKBAR);
  });

  it('falls back to UnknownError when the mutation error has no message', async () => {
    mockMutationHook(mocks.usePendingUserRemoveMutation, 'error', {
      error: new Error(''),
    });
    const { result } = renderActions();

    await act(async () => {
      result.current.rejectUser(pendingUser);
    });

    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'error',
      title: 'Utils.Error',
      description: 'Error.Server.UnknownError',
    });
  });

  it('uses selectedIds path for bulk approve mutations', async () => {
    const bulkApproveMutate = mockMutationHook(
      mocks.usePendingUsersBulkAcceptMutation,
      'success'
    );
    const { result } = renderActions('john');

    await act(async () => {
      result.current.handleBulkApprove(SELECTED_USERS);
    });

    expect(bulkApproveMutate).toHaveBeenCalledExactlyOnceWith({
      ids: ['user-1', 'user-2'],
      searchTerm: null,
      filters: [],
      excludedIds: [],
    });
    expect(onAfterBulkMutation).toHaveBeenCalledOnce();
  });

  it('uses selectAll path for bulk reject mutations with filters/search/excludedIds', async () => {
    const bulkRejectMutate = mockMutationHook(
      mocks.usePendingUsersBulkRemoveMutation,
      'success'
    );
    const { result } = renderActions('pending');

    const selectionState: SelectionState = {
      selectAll: true,
      selectedIds: new Set(),
      excludedIds: new Set(['user-3']),
    };

    await act(async () => {
      result.current.handleBulkReject(selectionState);
    });

    expect(bulkRejectMutate).toHaveBeenCalledExactlyOnceWith({
      ids: [],
      searchTerm: 'pending',
      filters: [{ key: FilterKey.OrganizationId, value: [ORGANIZATION_ID] }],
      excludedIds: ['user-3'],
    });
    expect(onAfterBulkMutation).toHaveBeenCalledOnce();
  });

  it('should show the server error and keep the list as is when approving a single pending user fails', async () => {
    // Given
    mockMutationHook(mocks.usePendingUserAcceptMutation, 'error', {
      error: new Error(SERVER_ERROR_CODE),
    });
    const { result } = renderActions();

    // When
    await act(async () => {
      result.current.approveUser(pendingUser);
    });

    // Then
    expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith(ERROR_SNACKBAR);
    expect(onAfterSingleMutation).not.toHaveBeenCalled();
  });

  it.each([
    {
      action: 'approve',
      hook: mocks.usePendingUsersBulkAcceptMutation,
      run: (actions: ReturnType<typeof usePendingUserActions>) =>
        actions.handleBulkApprove(SELECTED_USERS),
    },
    {
      action: 'reject',
      hook: mocks.usePendingUsersBulkRemoveMutation,
      run: (actions: ReturnType<typeof usePendingUserActions>) =>
        actions.handleBulkReject(SELECTED_USERS),
    },
  ])(
    'should show the server error and keep the selection when the bulk $action fails',
    async ({ hook, run }) => {
      // Given
      mockMutationHook(hook, 'error', {
        error: new Error(SERVER_ERROR_CODE),
      });
      const { result } = renderActions();

      // When
      await act(async () => {
        run(result.current);
      });

      // Then
      expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith(
        ERROR_SNACKBAR
      );
      expect(onAfterBulkMutation).not.toHaveBeenCalled();
    }
  );

  it('should still report an approval when the list is gone before the answer', async () => {
    // Given an approval still in flight when the tabs unmount the list
    mocks.usePendingUserAcceptMutation.mockReturnValue({ mutate: vi.fn() });
    const { result, unmount } = renderActions();
    act(() => {
      result.current.approveUser(pendingUser);
    });
    const [, { onSuccess }] = mocks.usePendingUserAcceptMutation.mock.lastCall!;
    unmount();

    // When
    act(() => onSuccess(ACCEPTED, { user_id: pendingUser.id }));

    // Then
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        description: `PendingUserListPage.ActionSuccessApprove:${pendingUser.email}`,
      })
    );
  });

  it('should name the user in each confirmation when two actions on that user are in flight at once', () => {
    // Given an accept and a removal of the same user, both still in flight
    mocks.usePendingUserAcceptMutation.mockReturnValue({ mutate: vi.fn() });
    mocks.usePendingUserRemoveMutation.mockReturnValue({ mutate: vi.fn() });
    const { result } = renderActions();
    act(() => {
      result.current.approveUser(pendingUser);
      result.current.rejectUser(pendingUser);
    });
    const [, accept] = mocks.usePendingUserAcceptMutation.mock.lastCall!;
    const [, remove] = mocks.usePendingUserRemoveMutation.mock.lastCall!;
    const variables = { user_id: pendingUser.id };

    // When
    act(() => {
      accept.onSuccess(ACCEPTED, variables);
      remove.onSuccess({}, variables);
    });

    // Then
    expect(
      mocks.showSnackbar.mock.calls.map(([{ description }]) => description)
    ).toEqual([
      `PendingUserListPage.ActionSuccessApprove:${pendingUser.email}`,
      `PendingUserListPage.ActionSuccessDeny:${pendingUser.email}`,
    ]);
  });
});
