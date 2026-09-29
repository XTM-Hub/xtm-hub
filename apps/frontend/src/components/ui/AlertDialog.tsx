import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  buttonVariants,
} from '@filigran/ui';
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
  variantName?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'tertiary'
    | 'link'
    | null
    | undefined;
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
              <Button
                variant="tertiary"
                size="icon"
                aria-label="aria-description">
                My button trigger text.
              </Button>
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
