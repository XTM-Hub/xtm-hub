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
import React, { ReactNode } from 'react';

interface AlertDialogProps {
  triggerElement?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  displayCancelButton?: boolean;
  AlertTitle: string;
  description?: string;
  actionButtonText?: string;
  children: ReactNode;
  onClickContinue: (e: React.MouseEvent<HTMLButtonElement>) => void;
  continueButtonDisabled?: boolean;
  variantName?: 'default' | 'destructive' | null | undefined;
}

/*
Element that displays an alert dialog, with an action button and a cancel button.
Example of use :
```
 <AlertDialogComponent
            AlertTitle={'AlertDialog title, string'}
            variantName={"destructive"} /*optional
            actionButtonText={"Delete"} /*optional
            displayCancelButton={false} /*optional, default true
            triggerElement={
              <IconButton
                priority="tertiary"
                aria-label="aria-description"
                icon={<MyIcon />}
              />
            } /* If you dont want to trigger it with triggerButton, you can choose open/isOpen option instead.
            onClickContinue={() => myCustomFunction(randomParam)}>
            Are you sure XXX ?
          </AlertDialogComponent>
 ```


 */
export const AlertDialogComponent = ({
  isOpen,
  onOpenChange,
  triggerElement,
  displayCancelButton = true,
  AlertTitle,
  description,
  actionButtonText = 'Continue',
  children,
  onClickContinue,
  variantName = 'default',
  continueButtonDisabled = false,
}: AlertDialogProps) => {
  const t = useTranslate();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}>
      {triggerElement && (
        <DialogTrigger asChild>{triggerElement}</DialogTrigger>
      )}
      <DialogContent
        role="alertdialog"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={displayCancelButton}
        {...(!description && { 'aria-describedby': undefined })}>
        <DialogTitle>{AlertTitle}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <DialogBody>{children}</DialogBody>
        <DialogFooter>
          {displayCancelButton && (
            <DialogClose asChild>
              <Button priority="secondary">{t('Utils.Cancel')}</Button>
            </DialogClose>
          )}
          <DialogClose asChild>
            <Button
              variant={variantName}
              onClick={onClickContinue}
              disabled={continueButtonDisabled}>
              {actionButtonText}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
