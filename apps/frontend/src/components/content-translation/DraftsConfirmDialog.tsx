'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  buttonVariants,
} from '@filigran/ui';
import { useTranslations } from 'next-intl';

interface DraftsConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

// Local to the editing UI rather than the shared AlertDialogComponent, whose
// labels go through useTranslate and would become editable in edit mode.
export const DraftsConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isDestructive = false,
  onConfirm,
}: DraftsConfirmDialogProps) => {
  const t = useTranslations();

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}>
      <AlertDialogContent className="z-[110]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('Utils.Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({
              variant: isDestructive ? 'destructive' : 'default',
            })}
            onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
