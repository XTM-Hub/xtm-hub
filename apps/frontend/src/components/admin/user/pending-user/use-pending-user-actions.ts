import {
  AcceptPendingUserBulkMutation,
  AcceptPendingUserMutation,
  RemovePendingUserBulkMutation,
  RemovePendingUserMutation,
} from '@/components/admin/user/pending-user/pending-user.graphql';
import { useTranslate } from '@/hooks/use-translate';
import { SelectionState } from '@filigran/ui';
import { useToast } from '@filigran/ui/clients';
import { PendingUserListAcceptUserBulkMutation } from '@generated/PendingUserListAcceptUserBulkMutation.graphql';
import { PendingUserListAcceptUserMutation } from '@generated/PendingUserListAcceptUserMutation.graphql';
import { PendingUserListRemoveUserBulkMutation } from '@generated/PendingUserListRemoveUserBulkMutation.graphql';
import { PendingUserListRemoveUserMutation } from '@generated/PendingUserListRemoveUserMutation.graphql';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { FilterKey } from '@graphql/generated';
import { useCallback } from 'react';
import { useMutation } from 'react-relay';

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
  const { toast } = useToast();

  const [approvePendingUser] = useMutation<PendingUserListAcceptUserMutation>(
    AcceptPendingUserMutation
  );
  const [rejectPendingUser] = useMutation<PendingUserListRemoveUserMutation>(
    RemovePendingUserMutation
  );
  const [bulkApprovePendingUsers] =
    useMutation<PendingUserListAcceptUserBulkMutation>(
      AcceptPendingUserBulkMutation
    );
  const [bulkRejectPendingUsers] =
    useMutation<PendingUserListRemoveUserBulkMutation>(
      RemovePendingUserBulkMutation
    );

  const onMutationError = useCallback(
    (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('Utils.Error'),
        description: t(`Error.Server.${error.message || 'UnknownError'}`),
      });
    },
    [t, toast]
  );

  const approveUser = useCallback(
    (user: UserList_fragment$data) => {
      approvePendingUser({
        variables: {
          user_id: user.id,
          organization_id: selectedOrganizationId,
        },
        onCompleted: (response) => {
          if (!response.acceptPendingUserInOrganization) {
            return;
          }

          toast({
            title: t('Utils.Success'),
            description: t('PendingUserListPage.ActionSuccessApprove', {
              email: user.email,
            }),
          });
          onAfterSingleMutation();
        },
        onError: onMutationError,
      });
    },
    [
      approvePendingUser,
      onAfterSingleMutation,
      onMutationError,
      selectedOrganizationId,
      t,
      toast,
    ]
  );

  const rejectUser = useCallback(
    (user: UserList_fragment$data) => {
      rejectPendingUser({
        variables: {
          user_id: user.id,
          organization_id: selectedOrganizationId,
        },
        onCompleted: () => {
          toast({
            title: t('Utils.Success'),
            description: t('PendingUserListPage.ActionSuccessDeny', {
              email: user.email,
            }),
          });
          onAfterSingleMutation();
        },
        onError: onMutationError,
      });
    },
    [
      onAfterSingleMutation,
      onMutationError,
      rejectPendingUser,
      selectedOrganizationId,
      t,
      toast,
    ]
  );

  const buildBulkQueryVariables = useCallback(
    (selectionState: SelectionState) => {
      if (selectionState.selectAll) {
        return {
          ids: [],
          searchTerm,
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
        searchTerm: undefined,
        filters: [],
        excludedIds: [],
      };
    },
    [organization, searchTerm]
  );

  const handleBulkApprove = useCallback(
    (selectionState: SelectionState) => {
      bulkApprovePendingUsers({
        variables: buildBulkQueryVariables(selectionState),
        onCompleted: onAfterBulkMutation,
        onError: onMutationError,
      });
    },
    [
      buildBulkQueryVariables,
      bulkApprovePendingUsers,
      onAfterBulkMutation,
      onMutationError,
    ]
  );

  const handleBulkReject = useCallback(
    (selectionState: SelectionState) => {
      bulkRejectPendingUsers({
        variables: buildBulkQueryVariables(selectionState),
        onCompleted: onAfterBulkMutation,
        onError: onMutationError,
      });
    },
    [
      buildBulkQueryVariables,
      bulkRejectPendingUsers,
      onAfterBulkMutation,
      onMutationError,
    ]
  );

  return {
    approveUser,
    rejectUser,
    handleBulkApprove,
    handleBulkReject,
  };
};
