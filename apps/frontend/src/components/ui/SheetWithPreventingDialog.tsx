import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslate } from '@/hooks/use-translate';
import { type AnalyticsContextAttributes } from '@/lib/analytics/analytics.context';
import { createContext, ReactNode, useContext, useState } from 'react';

interface UserFormSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  titleBadge?: ReactNode;
  description?: string;
  children: ReactNode;
  onOpenAutoFocus?: (event: Event) => void;
  analyticsContext?: AnalyticsContextAttributes;
}

interface DialogContextProps {
  handleCloseSheet: (e: React.MouseEvent<HTMLButtonElement>) => void;
  setIsDirty: (isDirty: boolean) => void;
  setUploadsDirty: (uploadsDirty: boolean) => void;
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
  titleBadge,
  description = '',
  children,
  onOpenAutoFocus,
  analyticsContext,
}: UserFormSheetProps) => {
  const t = useTranslate();
  const [openDialog, setOpenDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // Raised by the file fields: an upload is not in the form state, so reverting a field cannot undo it
  const [uploadsDirty, setUploadsDirty] = useState(false);

  const alertDialogSheetClose = (
    e?: Event | React.MouseEvent<HTMLButtonElement>
  ) => {
    if (isDirty || uploadsDirty) {
      e?.preventDefault();
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
        onOpenChange={(nextOpen) =>
          nextOpen ? setOpen(true) : alertDialogSheetClose()
        }>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent
          {...analyticsContext}
          side={'right'}
          closeLabel={t('Utils.Close')}
          onPointerDownOutside={(e) => alertDialogSheetClose(e)}
          onEscapeKeyDown={(e) => alertDialogSheetClose(e)}
          onOpenAutoFocus={onOpenAutoFocus}>
          <SheetHeader>
            <div className="flex items-center gap-3">
              <SheetTitle>{title}</SheetTitle>
              {titleBadge}
            </div>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <DialogContext.Provider
            value={{
              handleCloseSheet: alertDialogSheetClose,
              setIsDirty,
              setUploadsDirty,
              setOpenSheet: setOpen,
            }}>
            {children}
          </DialogContext.Provider>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        confirmAnalyticsId="common_unsaved_changes_confirm"
        analyticsContext={analyticsContext}
        title={t('DialogActions.PreventSheetTitle')}
        confirmLabel={t('MenuActions.Continue')}
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={() => setOpen(false)}>
        {t('DialogActions.PreventSheetSentence')}
      </ConfirmDialog>
    </>
  );
};
