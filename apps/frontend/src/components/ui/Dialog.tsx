import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@filigran/ui';
import { ReactNode } from 'react';

interface DialogInformativeProps {
  isOpen: boolean;
  onClose: () => void;
  onButtonClick?: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: 'default' | 'secondary';
  buttonText?: string;
  showFooter?: boolean;
}

export const DialogInformative = ({
  isOpen,
  onClose,
  onButtonClick,
  title,
  description,
  children,
  variant = 'secondary',
  buttonText = 'Utils.Close',
  showFooter = true,
}: DialogInformativeProps) => {
  const t = useTranslate();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
      <DialogContent>
        <DialogHeader className={'gap-s'}>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription className="whitespace-pre-line">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {children}
        {showFooter && (
          <DialogFooter className="justify-end">
            <DialogClose asChild>
              <Button
                className="mt-2 hover:cursor-pointer"
                type="button"
                variant={variant}
                onClick={onButtonClick ?? onClose}>
                {t(buttonText)}
              </Button>
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
