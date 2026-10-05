'use client';

import { useTranslate } from '@/hooks/use-translate';

export const EditableTextDemoContent = () => {
  const t = useTranslate('EditableTextDemo');

  return (
    <div className="flex flex-col gap-4 py-8">
      <h1 className="text-2xl font-bold">{t('Title')}</h1>
      <p className="text-muted-foreground">{t('Subtitle')}</p>
      <p className="text-muted-foreground mt-4 text-sm">{t('Instructions')}</p>
    </div>
  );
};
