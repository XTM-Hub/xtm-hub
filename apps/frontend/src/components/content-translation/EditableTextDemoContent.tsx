'use client';

import { useTranslate } from '@/hooks/use-translate';

// Shared body used by both the public demo page
// (app/(public)/[locale]/editable-text) and the private demo page
// (app/(application)/app/(user)/editable-text-demo). useTranslate() marks
// every string here for auto-detection while edit mode is on — see
// EditModeContentObserver — so this reads exactly like a plain
// useTranslations() call with zero manual wrapping.
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
