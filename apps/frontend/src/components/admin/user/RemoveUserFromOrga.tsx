import { getUserListContext } from '@/components/admin/user/UserListPage';
import { PortalContext } from '@/components/me/AppPortalContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { RemoveUserFromOrgaMutation } from '@generated/RemoveUserFromOrgaMutation.graphql';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { useContext } from 'react';
import { graphql, useMutation } from 'react-relay';

interface RemoveUserFromOrgaProps {
  user: UserList_fragment$data;
}

const removeUser = graphql`
  mutation RemoveUserFromOrgaMutation(
    $connections: [ID!]!
    $user_id: UserId!
    $organization_id: OrganizationId!
  ) {
    removeUserFromOrganization(
      user_id: $user_id
      organization_id: $organization_id
    ) {
      id @deleteEdge(connections: $connections)
      ...UserList_fragment
    }
  }
`;

export const RemoveUserFromOrga = ({ user }: RemoveUserFromOrgaProps) => {
  const { me } = useContext(PortalContext);
  const { connectionID } = getUserListContext();
  const { setOpenSheet } = useDialogContext();
  const t = useTranslate();
  const [removeUserMutation] =
    useMutation<RemoveUserFromOrgaMutation>(removeUser);
  const onRemoveUser = (user_id: string): void => {
    removeUserMutation({
      variables: {
        user_id,
        organization_id: me!.selected_organization_id,
        connections: [connectionID ?? ''],
      },
      onCompleted: () => {
        setOpenSheet(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('UserActions.UserRemoved', { email: user.email }),
        });
      },
      onError: (error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };

  const trigger = (
    <Button
      variant="destructive"
      priority="secondary">
      {t('MenuActions.Remove')}
    </Button>
  );

  return (
    <ConfirmDialog
      title={t('UserActions.RemoveUser')}
      confirmLabel={t('MenuActions.Remove')}
      destructive
      trigger={trigger}
      onConfirm={() => onRemoveUser(user.id)}>
      {t('RemoveUserOrgDialog.TextRemoveThisUser', {
        email: user.email,
      })}
    </ConfirmDialog>
  );
};
