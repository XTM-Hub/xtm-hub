'use client';

import { useTranslate } from '@/hooks/use-translate';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@filigran/ui';
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
      <AlertDialog
        open={isOpen}
        onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button">{texts?.selectFile}</Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts?.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {texts?.dialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('Utils.Cancel')}</AlertDialogCancel>
            <Button
              type="button"
              onClick={openFileDialog}>
              {t('Utils.Continue')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
