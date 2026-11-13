import { PendingUser } from '@/components/admin/user/pending-user/pending-user-list.types';
import { SelectionState } from '@/components/ui/data-table';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  FilterKey,
  usePendingUserAcceptMutation,
  usePendingUserRemoveMutation,
  usePendingUsersBulkAcceptMutation,
  usePendingUsersBulkRemoveMutation,
} from '@graphql/generated';
import { useCallback, useRef } from 'react';

interface UsePendingUserActionsParams {
  organization: string;
  selectedOrganizationId: string;
  searchTerm?: string;
  onAfterSingleMutation: () => void;
  onAfterBulkMutation: () => void;
}

export const usePendingUserActions = ({
  organization,
  selectedOrganizationId,
  searchTerm,
  onAfterSingleMutation,
  onAfterBulkMutation,
}: UsePendingUserActionsParams) => {
  const t = useTranslate();

  // The success message names the user, whom the mutation variables only know
  // by id. The email of a user never changes, so it is kept for every action
  // on that user, even two in flight at once.
  const emailsByUserId = useRef(new Map<string, string>());
  const emailOf = (userId: string) => emailsByUserId.current.get(userId) ?? '';

  const onMutationError = (error: Error) => {
    showSnackbar({
      severity: 'error',
      title: t('Utils.Error'),
      description: t(`Error.Server.${error.message || 'UnknownError'}`),
    });
  };

  // The outcome callbacks are on the hooks, not on mutate: they still run once
  // the tabs have unmounted the list.
  const { mutate: approvePendingUser } = usePendingUserAcceptMutation<Error>(
    portalGraphqlClient,
    {
      onSuccess: (response, { user_id }) => {
        if (!response.acceptPendingUserInOrganization) {
          return;
        }

        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('PendingUserListPage.ActionSuccessApprove', {
            email: emailOf(user_id),
          }),
        });
        onAfterSingleMutation();
      },
      onError: onMutationError,
    }
  );
  const { mutate: rejectPendingUser } = usePendingUserRemoveMutation<Error>(
    portalGraphqlClient,
    {
      onSuccess: (_response, { user_id }) => {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('PendingUserListPage.ActionSuccessDeny', {
            email: emailOf(user_id),
          }),
        });
        onAfterSingleMutation();
      },
      onError: onMutationError,
    }
  );
  const { mutate: bulkApprovePendingUsers } =
    usePendingUsersBulkAcceptMutation<Error>(portalGraphqlClient, {
      onSuccess: onAfterBulkMutation,
      onError: onMutationError,
    });
  const { mutate: bulkRejectPendingUsers } =
    usePendingUsersBulkRemoveMutation<Error>(portalGraphqlClient, {
      onSuccess: onAfterBulkMutation,
      onError: onMutationError,
    });

  const approveUser = useCallback(
    (user: PendingUser) => {
      emailsByUserId.current.set(user.id, user.email);
      approvePendingUser({
        user_id: user.id,
        organization_id: selectedOrganizationId,
      });
    },
    [approvePendingUser, selectedOrganizationId]
  );

  const rejectUser = useCallback(
    (user: PendingUser) => {
      emailsByUserId.current.set(user.id, user.email);
      rejectPendingUser({
        user_id: user.id,
        organization_id: selectedOrganizationId,
      });
    },
    [rejectPendingUser, selectedOrganizationId]
  );

  const buildBulkQueryVariables = useCallback(
    (selectionState: SelectionState) => {
      if (selectionState.selectAll) {
        return {
          ids: [],
          searchTerm: searchTerm ?? null,
          filters: [
            {
              key: FilterKey.OrganizationId,
              value: [organization],
            },
          ],
          excludedIds: Array.from(selectionState.excludedIds),
        };
      }

      return {
        ids: Array.from(selectionState.selectedIds),
        searchTerm: null,
        filters: [],
        excludedIds: [],
      };
    },
    [organization, searchTerm]
  );

  const handleBulkApprove = useCallback(
    (selectionState: SelectionState) => {
      bulkApprovePendingUsers(buildBulkQueryVariables(selectionState));
    },
    [buildBulkQueryVariables, bulkApprovePendingUsers]
  );

  const handleBulkReject = useCallback(
    (selectionState: SelectionState) => {
      bulkRejectPendingUsers(buildBulkQueryVariables(selectionState));
    },
    [buildBulkQueryVariables, bulkRejectPendingUsers]
  );

  return {
    approveUser,
    rejectUser,
    handleBulkApprove,
    handleBulkReject,
  };
};
