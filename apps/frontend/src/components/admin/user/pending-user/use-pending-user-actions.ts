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

// The actions in flight on each pending user, with the email to name the user
// in their confirmation.
type InFlightActions = Map<string, { email: string; count: number }>;

const trackInFlight = (
  inFlight: InFlightActions,
  { id, email }: PendingUser
) => {
  inFlight.set(id, { email, count: (inFlight.get(id)?.count ?? 0) + 1 });
};

// Counted, not dropped at once: an accept and a removal of the same user can
// be in flight together, and the first to settle must keep the email for the
// other.
const releaseInFlight = (inFlight: InFlightActions, userId: string) => {
  const entry = inFlight.get(userId);
  if (!entry || entry.count <= 1) {
    inFlight.delete(userId);
    return;
  }
  entry.count -= 1;
};

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
  // by id: the email is kept while an action on that user is in flight.
  const inFlightByUserId = useRef<InFlightActions>(new Map());
  const emailOf = (userId: string) =>
    inFlightByUserId.current.get(userId)?.email ?? '';
  // On success and on error alike, once onSuccess has read the email.
  const onSingleMutationSettled = (
    _data: unknown,
    _error: unknown,
    { user_id }: { user_id: string }
  ) => releaseInFlight(inFlightByUserId.current, user_id);

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
      onSettled: onSingleMutationSettled,
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
      onSettled: onSingleMutationSettled,
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
      trackInFlight(inFlightByUserId.current, user);
      approvePendingUser({
        user_id: user.id,
        organization_id: selectedOrganizationId,
      });
    },
    [approvePendingUser, selectedOrganizationId]
  );

  const rejectUser = useCallback(
    (user: PendingUser) => {
      trackInFlight(inFlightByUserId.current, user);
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
