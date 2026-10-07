'use client';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@filigran/design-system';
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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent
        role="alertdialog"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton
        className="z-[110]">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button priority="secondary">{t('Utils.Cancel')}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant={isDestructive ? 'destructive' : 'default'}
              onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
