'use client';

import { useEditMode } from '@/context/edit-mode-context';
import { withContentKeyMarkers } from '@/utils/content-translation/with-content-key-markers';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export const useTranslate = (namespace?: string) => {
  const t = useTranslations(namespace);
  const { isEditMode } = useEditMode();

  // As stable as next-intl's t: effects depending on it must not re-run on
  // every render.
  return useMemo(
    () => (isEditMode ? withContentKeyMarkers(t, namespace) : t),
    [t, isEditMode, namespace]
  );
};
