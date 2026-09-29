'use client';

import { useEditMode } from '@/context/edit-mode-context';
import { useContentEditModeToggle } from '@/hooks/use-content-edit-mode-toggle';
import { useContentTranslationDrafts } from '@/hooks/use-content-translation-drafts';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  toast,
} from '@filigran/ui';
import { useTranslations } from 'next-intl';

interface ExitEditModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const keepDrafts = async () => {};

// Asks what to do with unpublished drafts before leaving edit mode (see
// useExitEditMode). Plain useTranslations, not useTranslate: the editing UI
// must never mark its own labels as editable.
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
        toast({ variant: 'destructive', title: t('Utils.Error') });
      });
  };

  const isBusy = isPending || isExiting;

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}>
      <AlertDialogContent className="z-[110]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('EditableText.ExitDialogTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('EditableText.ExitDialogDescription', {
              count: pendingChangeCount,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="tertiary"
            disabled={isBusy}
            onClick={() => exitAfter(keepDrafts)}>
            {t('EditableText.KeepDraftsAndExit')}
          </Button>
          <Button
            variant="secondary-destructive"
            disabled={isBusy}
            onClick={() => exitAfter(discardDrafts)}>
            {t('EditableText.DiscardAndExit')}
          </Button>
          <Button
            disabled={isBusy}
            onClick={() => exitAfter(publishDrafts)}>
            {t('EditableText.PublishAndExit')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
