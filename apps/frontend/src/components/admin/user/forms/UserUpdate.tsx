import { AdminUserUpdateForm } from '@/components/admin/user/forms/admin/AdminUserUpdateForm';
import { UserUpdateForm } from '@/components/admin/user/forms/UserUpdateForm';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import useAdminPath from '@/hooks/use-admin-path';
import { useSheetOpenState } from '@/hooks/use-sheet-open-state';
import { useTranslate } from '@/hooks/use-translate';
import { ReactNode } from 'react';

interface EditUserProps {
  user: UsersListUser;
  trigger?: ReactNode;
  onCloseSheet?: () => void;
  defaultStateOpen?: boolean;
}

export const EditUser = ({
  user,
  trigger,
  onCloseSheet,
  defaultStateOpen = false,
}: EditUserProps) => {
  const isAdminPath = useAdminPath();
  const [openSheet, handleOpenSheet] = useSheetOpenState(
    defaultStateOpen,
    onCloseSheet
  );
  const t = useTranslate();

  return (
    <SheetWithPreventingDialog
      title={t('UserActions.UpdateUser', { email: user.email })}
      open={openSheet}
      setOpen={handleOpenSheet}
      trigger={trigger}>
      {isAdminPath ? (
        <AdminUserUpdateForm
          user={user}
          callback={() => handleOpenSheet(false)}
        />
      ) : (
        <UserUpdateForm
          user={user}
          callback={() => handleOpenSheet(false)}
        />
      )}
    </SheetWithPreventingDialog>
  );
};
