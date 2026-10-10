import { AdminUserUpdateForm } from '@/components/admin/user/forms/admin/AdminUserUpdateForm';
import { UserUpdateForm } from '@/components/admin/user/forms/UserUpdateForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { ReactNode, useRef, useState } from 'react';

interface EditUserProps {
  user: UserList_fragment$data;
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
  const [openSheet, setOpenSheet] = useState(defaultStateOpen ?? false);
  // Shared by every closure, so a repeated or late close notifies once.
  const openSheetRef = useRef(openSheet);
  const t = useTranslate();

  const handleOpenSheet = (open: boolean) => {
    if (openSheetRef.current && !open) {
      onCloseSheet?.();
    }
    openSheetRef.current = open;
    setOpenSheet(open);
  };

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
