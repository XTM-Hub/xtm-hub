'use client';

import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@filigran/design-system';
import { useRef, useState } from 'react';

const FileInputWithPrevent = ({
  texts,
  allowedTypes,
  field,
}: {
  texts?: {
    selectFile: string;
    dialogTitle: string;
    dialogDescription: string;
  };
  allowedTypes?: string;
  field: {
    onChange: (value: FileList) => void;
    name: string;
    value?: FileList;
  };
}) => {
  const t = useTranslate();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      field.onChange(files);
      setIsOpen(false);
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button type="button">{texts?.selectFile}</Button>
        </DialogTrigger>

        <DialogContent
          role="alertdialog"
          onInteractOutside={(e) => e.preventDefault()}
          hideCloseButton>
          <DialogTitle>{texts?.dialogTitle}</DialogTitle>
          <DialogDescription>{texts?.dialogDescription}</DialogDescription>

          <DialogFooter>
            <DialogClose asChild>
              <Button priority="secondary">{t('Utils.Cancel')}</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={openFileDialog}>
              {t('Utils.Continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={inputRef}
        type="file"
        name={field.name}
        accept={allowedTypes}
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
};

export default FileInputWithPrevent;
