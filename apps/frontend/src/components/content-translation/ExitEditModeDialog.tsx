'use client';

import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useEditMode } from '@/context/edit-mode-context';
import { useContentEditModeToggle } from '@/hooks/use-content-edit-mode-toggle';
import { useContentTranslationDrafts } from '@/hooks/use-content-translation-drafts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@filigran/design-system';
import { useTranslations } from 'next-intl';

interface ExitEditModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const keepDrafts = async () => {};

export const ExitEditModeDialog = ({
  open,
  onOpenChange,
}: ExitEditModeDialogProps) => {
  const t = useTranslations();
  const { pendingChangeCount } = useEditMode();
  const { publishDrafts, discardDrafts, isPending } =
    useContentTranslationDrafts();
  const { setEditMode, isPending: isExiting } = useContentEditModeToggle();

  const exitAfter = (settleDrafts: () => Promise<void>) => {
    settleDrafts()
      .then(() => {
        onOpenChange(false);
        setEditMode(false);
      })
      .catch(() => {
        showSnackbar({ severity: 'error', title: t('Utils.Error') });
      });
  };

  const isBusy = isPending || isExiting;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent
        role="alertdialog"
        onInteractOutside={(e) => e.preventDefault()}
        className="z-[110]">
        <DialogTitle>{t('EditableText.ExitDialogTitle')}</DialogTitle>
        <DialogDescription>
          {t('EditableText.ExitDialogDescription', {
            count: pendingChangeCount,
          })}
        </DialogDescription>
        <DialogFooter>
          <Button
            priority="tertiary"
            disabled={isBusy}
            onClick={() => exitAfter(keepDrafts)}>
            {t('EditableText.KeepDraftsAndExit')}
          </Button>
          <Button
            variant="destructive"
            priority="secondary"
            disabled={isBusy}
            onClick={() => exitAfter(discardDrafts)}>
            {t('EditableText.DiscardAndExit')}
          </Button>
          <Button
            disabled={isBusy}
            onClick={() => exitAfter(publishDrafts)}>
            {t('EditableText.PublishAndExit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
