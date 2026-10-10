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
} from '@filigran/design-system';
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
  const priority = variant === 'default' ? 'primary' : 'secondary';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && (
          <DialogDescription className="whitespace-pre-line">
            {description}
          </DialogDescription>
        )}
        {children && (
          <DialogBody className="flex flex-col gap-4">{children}</DialogBody>
        )}
        {showFooter && (
          <DialogFooter>
            <DialogClose asChild>
              <Button
                className="mt-2 hover:cursor-pointer"
                type="button"
                priority={priority}
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
