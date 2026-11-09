'use client';

import { ExitEditModeDialog } from '@/components/content-translation/ExitEditModeDialog';
import { NAVIGATION_ACTIVE_CLASSES } from '@/components/menu/navigation/shared/navigation-styles';
import { useEditMode } from '@/context/edit-mode-context';
import { useContentEditModeToggle } from '@/hooks/use-content-edit-mode-toggle';
import { useExitEditMode } from '@/hooks/use-exit-edit-mode';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import { Button } from '@filigran/design-system';
import { LanguageIcon } from '@filigran/icon';
import { useTranslations } from 'next-intl';

interface EditTranslationsButtonProps {
  open: boolean;
}

export const EditTranslationsButton = ({
  open,
}: EditTranslationsButtonProps) => {
  const t = useTranslations('EditableText');
  const { canEditContent, isEditMode } = useEditMode();
  const { setEditMode, isPending } = useContentEditModeToggle();
  const {
    exitEditMode,
    isPending: isExiting,
    exitDialogProps,
  } = useExitEditMode();

  if (!canEditContent) {
    return null;
  }

  return (
    <div className="shrink-0">
      <Button
        {...analyticsId('admin_translation_mode_toggle')}
        priority="tertiary"
        disabled={isPending || isExiting}
        className={cn(
          'h-9 px-3 w-full justify-start rounded-none text-default-primary',
          isEditMode && NAVIGATION_ACTIVE_CLASSES
        )}
        onClick={() => (isEditMode ? exitEditMode() : setEditMode(true))}>
        <span className="flex w-8 shrink-0 justify-center">
          <LanguageIcon
            className={cn(
              'h-6 w-6 p-1',
              isEditMode ? 'text-icon-highlight' : 'text-icon-subtle'
            )}
          />
        </span>
        <span
          className={cn(
            'normal-case',
            isEditMode ? 'text-filigran-brand-primary' : 'text-default-primary',
            open ? 'ml-2' : 'sr-only'
          )}>
          {t(isEditMode ? 'MenuButtonExit' : 'MenuButton')}
        </span>
      </Button>
      <ExitEditModeDialog {...exitDialogProps} />
    </div>
  );
};
