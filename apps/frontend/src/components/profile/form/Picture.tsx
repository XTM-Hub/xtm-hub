'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@filigran/design-system';
import { EditIcon } from '@filigran/icon';
import { Avatar } from '@filigran/ui';
import React, { useContext, useRef, useState } from 'react';

interface ProfileFormPictureProps {
  onSubmit: (files: (File | null)[]) => void;
}

export const ProfileFormPicture = ({ onSubmit }: ProfileFormPictureProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (preview) {
        // If there is already a preview, we need to revoke the object URL to avoid memory leaks
        URL.revokeObjectURL(preview);
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      if (preview) {
        // Revoke the object URL to avoid memory leaks
        URL.revokeObjectURL(preview);
      }
      onSubmit([selectedFile]);
      setSelectedFile(null);
      setPreview(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">{t('ProfilePage.Picture')}</CardTitle>
      </CardHeader>
      <CardContent clamp={0}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg, image/png, image/gif, image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          className="size-24 cursor-pointer [&_img]:object-cover"
          onClick={() => inputRef.current?.click()}>
          <Avatar src={preview || me?.picture || undefined} />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          priority="tertiary"
          aria-label={t('Utils.Edit')}
          className="ml-s"
          startIcon={<EditIcon className="h-4 w-4" />}
          onClick={() => inputRef.current?.click()}>
          {t('Utils.Edit')}
        </Button>
        <Button
          aria-label={t('ProfilePage.UpdatePicture')}
          onClick={handleSubmit}>
          {t('Utils.Update')}
        </Button>
      </CardFooter>
    </Card>
  );
};
