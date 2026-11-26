import { PendingUserDialogState } from '@/components/admin/user/pending-user/pending-user-list.types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTranslate } from '@/hooks/use-translate';
import { ReactNode } from 'react';

const renderStrong = (chunks: ReactNode) => <strong>{chunks}</strong>;

interface PendingUserConfirmDialogProps {
  pendingUserDialog: PendingUserDialogState | null;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
}

export const PendingUserConfirmDialog = ({
  pendingUserDialog,
  onOpenChange,
  onConfirm,
}: PendingUserConfirmDialogProps) => {
  const t = useTranslate();
  if (!pendingUserDialog) {
    return null;
  }

  const isApproval = pendingUserDialog.action === 'approve';
  const i18nKey = isApproval
    ? 'PendingUserListPage.WarningUserAccept'
    : 'PendingUserListPage.WarningUserRejection';

  return (
    <ConfirmDialog
      confirmAnalyticsId={
        isApproval
          ? 'organization_join_request_approval_confirm'
          : 'organization_join_request_rejection_confirm'
      }
      open={!!pendingUserDialog}
      onOpenChange={onOpenChange}
      title={t(`${i18nKey}.Title`)}
      confirmLabel={t(`${i18nKey}.Confirm`)}
      onConfirm={onConfirm}>
      <div className="flex items-center gap-2">
        <span>
          {t.rich(`${i18nKey}.Description`, {
            email: pendingUserDialog.user.email,
            strong: renderStrong,
          })}
        </span>
      </div>
    </ConfirmDialog>
  );
};
