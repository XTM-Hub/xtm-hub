'use client';

import { ExitEditModeDialog } from '@/components/content-translation/ExitEditModeDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useEditMode } from '@/context/edit-mode-context';
import { useContentTranslationDrafts } from '@/hooks/use-content-translation-drafts';
import { useExitEditMode } from '@/hooks/use-exit-edit-mode';
import { cn } from '@/lib/utils';
import { Button } from '@filigran/design-system';
import { EditIcon } from '@filigran/icon';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type PendingDraftsAction = 'publish' | 'discard';

// The banner sits on the primary color: the default and secondary variants
// would blend into it.
const SOLID_BUTTON_CLASSES =
  'bg-primary-foreground text-primary hover:bg-primary-foreground/90';
const OUTLINE_BUTTON_CLASSES =
  'border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10';

export const EditionModeBanner = () => {
  const t = useTranslations();
  const router = useRouter();
  const {
    isEditMode,
    pendingChangeCount,
    showEditableAreas,
    setShowEditableAreas,
  } = useEditMode();
  const { publishDrafts, discardDrafts, isPending } =
    useContentTranslationDrafts();
  const {
    exitEditMode,
    isPending: isExiting,
    exitDialogProps,
  } = useExitEditMode();
  const [confirmedAction, setConfirmedAction] =
    useState<PendingDraftsAction | null>(null);

  if (!isEditMode) {
    return null;
  }

  const settleDrafts = (action: () => Promise<void>) => {
    action()
      .then(() => router.refresh())
      .catch(() => {
        showSnackbar({ severity: 'error', title: t('Utils.Error') });
      });
  };

  const closeConfirmation = (open: boolean) => {
    if (!open) {
      setConfirmedAction(null);
    }
  };

  return (
    <div className="bg-primary text-primary-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
      <span>
        {t(
          showEditableAreas
            ? 'EditableText.EditionBannerLabel'
            : 'EditableText.EditionBannerHiddenAreasLabel'
        )}
      </span>
      <Button
        priority="secondary"
        aria-pressed={showEditableAreas}
        className={cn(
          showEditableAreas ? SOLID_BUTTON_CLASSES : OUTLINE_BUTTON_CLASSES
        )}
        startIcon={<EditIcon className="h-4 w-4" />}
        onClick={() => setShowEditableAreas(!showEditableAreas)}>
        {t('EditableText.ShowEditableAreas')}
      </Button>
      {pendingChangeCount > 0 && (
        <span className="flex items-center gap-2">
          <span className="font-semibold">
            {t('EditableText.PendingChanges', { count: pendingChangeCount })}
          </span>
          <Button
            disabled={isPending}
            className={SOLID_BUTTON_CLASSES}
            onClick={() => setConfirmedAction('publish')}>
            {t('EditableText.Publish')}
          </Button>
          <Button
            priority="secondary"
            disabled={isPending}
            className={OUTLINE_BUTTON_CLASSES}
            onClick={() => setConfirmedAction('discard')}>
            {t('EditableText.Discard')}
          </Button>
        </span>
      )}
      <Button
        priority="tertiary"
        disabled={isExiting}
        className="h-auto p-0 normal-case text-sm text-primary-foreground underline underline-offset-2"
        onClick={exitEditMode}>
        {t('EditableText.EditionBannerExit')}
      </Button>

      <ConfirmDialog
        open={confirmedAction === 'publish'}
        onOpenChange={closeConfirmation}
        title={t('EditableText.PublishConfirmTitle', {
          count: pendingChangeCount,
        })}
        description={t('EditableText.PublishConfirmDescription')}
        confirmLabel={t('EditableText.Publish')}
        cancelLabel={t('Utils.Cancel')}
        onConfirm={() => settleDrafts(publishDrafts)}
        className="z-[110]"
      />
      <ConfirmDialog
        open={confirmedAction === 'discard'}
        onOpenChange={closeConfirmation}
        title={t('EditableText.DiscardConfirmTitle', {
          count: pendingChangeCount,
        })}
        description={t('EditableText.DiscardConfirmDescription')}
        confirmLabel={t('EditableText.Discard')}
        cancelLabel={t('Utils.Cancel')}
        destructive
        onConfirm={() => settleDrafts(discardDrafts)}
        className="z-[110]"
      />
      <ExitEditModeDialog {...exitDialogProps} />
    </div>
  );
};
