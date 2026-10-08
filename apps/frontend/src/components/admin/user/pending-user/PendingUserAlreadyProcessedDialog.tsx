import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTranslate } from '@/hooks/use-translate';

interface PendingUserAlreadyProcessedDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const PendingUserAlreadyProcessedDialog = ({
  isOpen,
  onOpenChange,
}: PendingUserAlreadyProcessedDialogProps) => {
  const t = useTranslate();

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      hideCancelButton
      title={t('PendingUserListPage.AlreadyProcessed.Title')}
      confirmLabel={t('PendingUserListPage.AlreadyProcessed.Confirm')}
      onConfirm={() => onOpenChange(false)}>
      <div className="flex items-center gap-2">
        <span>{t('PendingUserListPage.AlreadyProcessed.Description')}</span>
      </div>
    </ConfirmDialog>
  );
};
