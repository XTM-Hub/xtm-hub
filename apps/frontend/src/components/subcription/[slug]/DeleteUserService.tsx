import { invalidateUserServiceQueries } from '@/components/subcription/user-service.invalidation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  type UserServiceItemFragment,
  useDeleteUserServicesMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteUserServiceProps {
  userServices: UserServiceItemFragment[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export const DeleteUserService = ({
  userServices,
  isOpen,
  onOpenChange,
  onDeleted,
}: DeleteUserServiceProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { mutate: deleteUserServices } = useDeleteUserServicesMutation(
    portalGraphqlClient,
    {
      onSuccess: async () => {
        await invalidateUserServiceQueries(queryClient);
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (error: Error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    }
  );

  const handleConfirmDelete = () => {
    const userServiceIds = userServices
      .map((userService) => userService.id)
      .filter((id): id is string => !!id);

    deleteUserServices({
      input: {
        userServiceIds,
      },
      service_instance_id: userServices[0]?.subscription?.service_instance?.id,
    });
  };

  if (userServices.length === 0) {
    return null;
  }

  return (
    <ConfirmDialog
      confirmAnalyticsId="subscription_user_access_removal_confirm"
      key={`delete-${userServices.map((userService) => userService.id).join('-')}`}
      title={t('Service.Management.RemoveAccess')}
      confirmLabel={t('Service.Management.RemoveAccess')}
      destructive
      open={isOpen}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirmDelete}>
      {userServices.length > 1
        ? t('Service.Management.AreYouSureRemoveUsersAccess', {
            count: userServices.length,
          })
        : t('Service.Management.AreYouSureRemoveAccess', {
            firstname: userServices[0]?.user?.first_name ?? '',
            lastname: userServices[0]?.user?.last_name ?? '',
          })}
    </ConfirmDialog>
  );
};
