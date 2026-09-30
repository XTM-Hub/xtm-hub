import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@filigran/ui';
import { useTranslations } from 'next-intl';
import React, { ReactNode } from 'react';
import { buttonVariants } from '@filigran/design-system';

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
  const t = useTranslations();

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={onOpenChange}>
      {triggerElement && (
        <AlertDialogTrigger asChild>{triggerElement}</AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{AlertTitle}</AlertDialogTitle>
          <AlertDialogDescription className={cn(!description && 'sr-only')}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          {displayCancelButton && (
            <AlertDialogCancel>{t('Utils.Cancel')}</AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={onClickContinue}
            disabled={continueButtonDisabled}
            className={buttonVariants({ variant: variantName })}>
            {actionButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
