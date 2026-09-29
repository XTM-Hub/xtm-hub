import { UserServiceDeleteMutation } from '@/components/service/user_service.graphql';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import { userServiceDeleteMutation } from '@generated/userServiceDeleteMutation.graphql';
import { userServices_fragment$data } from '@generated/userServices_fragment.graphql';
import { useMutation } from 'react-relay';

interface DeleteUserServiceProps {
  userServices: userServices_fragment$data[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  onDeleted?: () => void;
}

export const DeleteUserService = ({
  userServices,
  isOpen,
  onOpenChange,
  connectionId,
  onDeleted,
}: DeleteUserServiceProps) => {
  const t = useTranslate();
  const [commitUserServiceDeletingMutation] =
    useMutation<userServiceDeleteMutation>(UserServiceDeleteMutation);

  const handleConfirmDelete = () => {
    const userServiceIds = userServices
      .map((userService) => userService.id)
      .filter((id): id is string => !!id);

    commitUserServiceDeletingMutation({
      variables: {
        connections: [connectionId],
        input: {
          userServiceIds,
        },
        service_instance_id:
          userServices[0]?.subscription?.service_instance?.id,
      },
      onCompleted: () => {
        onOpenChange(false);
        onDeleted?.();
      },
    });
  };

  if (userServices.length === 0) {
    return null;
  }

  return (
    <AlertDialogComponent
      key={`delete-${userServices.map((userService) => userService.id).join('-')}`}
      AlertTitle={t('Service.Management.RemoveAccess')}
      actionButtonText={t('Service.Management.RemoveAccess')}
      variantName={'destructive'}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClickContinue={handleConfirmDelete}>
      {userServices.length > 1
        ? t('Service.Management.AreYouSureRemoveUsersAccess', {
            count: userServices.length,
          })
        : t('Service.Management.AreYouSureRemoveAccess', {
            firstname: userServices[0]?.user?.first_name ?? '',
            lastname: userServices[0]?.user?.last_name ?? '',
          })}
    </AlertDialogComponent>
  );
};
