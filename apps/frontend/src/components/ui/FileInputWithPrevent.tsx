'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { MouseEvent, useRef, useState } from 'react';

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

  const openFileDialog = (e: MouseEvent<HTMLButtonElement>) => {
    // Closes on file pick instead, so a dismissed picker keeps the confirmation up.
    e.preventDefault();
    inputRef.current?.click();
  };

  return (
    <>
      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        trigger={<Button type="button">{texts?.selectFile}</Button>}
        title={texts?.dialogTitle ?? ''}
        description={texts?.dialogDescription}
        confirmLabel={t('Utils.Continue')}
        onConfirm={openFileDialog}
      />

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
