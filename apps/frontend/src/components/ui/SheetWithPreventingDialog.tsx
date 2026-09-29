import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@filigran/ui';
import { createContext, ReactNode, useContext, useState } from 'react';

interface UserFormSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  onOpenAutoFocus?: (event: Event) => void;
}

interface DialogContextProps {
  handleCloseSheet: (e: React.MouseEvent<HTMLButtonElement>) => void;
  setIsDirty: (isDirty: boolean) => void;
  setOpenSheet: (open: boolean) => void;
}
const DialogContext = createContext<DialogContextProps | undefined>(undefined);

export const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogContext must be used within a DialogProvider');
  }
  return context;
};

export const SheetWithPreventingDialog = ({
  open,
  setOpen,
  trigger,
  title,
  description = '',
  children,
  onOpenAutoFocus,
}: UserFormSheetProps) => {
  const t = useTranslate();
  const [openDialog, setOpenDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const alertDialogSheetClose = (
    e: Event | React.MouseEvent<HTMLButtonElement>
  ) => {
    if (isDirty) {
      e.preventDefault();
      setOpenDialog(true);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <Sheet
        key={'right'}
        open={open}
        onOpenChange={setOpen}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent
          side={'right'}
          className="layer-2"
          onPointerDownOutside={(e) => alertDialogSheetClose(e)}
          onOpenAutoFocus={onOpenAutoFocus}>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <DialogContext.Provider
            value={{
              handleCloseSheet: alertDialogSheetClose,
              setIsDirty,
              setOpenSheet: setOpen,
            }}>
            {children}
          </DialogContext.Provider>
        </SheetContent>
      </Sheet>
      <AlertDialogComponent
        AlertTitle={t('DialogActions.PreventSheetTitle')}
        actionButtonText={t('MenuActions.Continue')}
        isOpen={openDialog}
        onOpenChange={setOpenDialog}
        onClickContinue={() => setOpen(false)}>
        {t('DialogActions.PreventSheetSentence')}
      </AlertDialogComponent>
    </>
  );
};
