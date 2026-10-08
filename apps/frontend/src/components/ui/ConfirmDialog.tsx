import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@filigran/design-system';
import { MouseEvent, ReactNode } from 'react';

export interface ConfirmDialogProps {
  /** Opens the dialog on click; without it, drive the dialog with `open`. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accessible name of the `alertdialog`. */
  title: string;
  description?: ReactNode;
  /** Free content between the title block and the footer. */
  children?: ReactNode;
  confirmLabel: string;
  /** Closes the dialog after it runs, unless it calls `event.preventDefault()`. */
  onConfirm: (event: MouseEvent<HTMLButtonElement>) => void;
  destructive?: boolean;
  confirmDisabled?: boolean;
  /** Without Cancel, the corner close icon is the way out. */
  hideCancelButton?: boolean;
  /** Defaults to the translated Cancel, which edit mode marks as editable copy. */
  cancelLabel?: string;
  className?: string;
}

export const ConfirmDialog = ({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  destructive = false,
  confirmDisabled = false,
  hideCancelButton = false,
  cancelLabel,
  className,
}: ConfirmDialogProps) => {
  const t = useTranslate();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        role="alertdialog"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={!hideCancelButton}
        className={className}
        {...(!description && { 'aria-describedby': undefined })}>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        {children && <DialogBody>{children}</DialogBody>}
        <DialogFooter>
          {!hideCancelButton && (
            <DialogClose asChild>
              <Button priority="secondary">
                {cancelLabel ?? t('Utils.Cancel')}
              </Button>
            </DialogClose>
          )}
          <DialogClose asChild>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              disabled={confirmDisabled}
              onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
