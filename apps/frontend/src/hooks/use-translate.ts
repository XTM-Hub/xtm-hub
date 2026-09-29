'use client';

import { useEditMode } from '@/context/edit-mode-context';
import { withContentKeyMarkers } from '@/utils/content-translation/with-content-key-markers';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

// Drop-in replacement for next-intl's useTranslations(namespace): while edit
// mode is on, rendered strings carry an invisible content-key marker (see
// withContentKeyMarkers); otherwise next-intl's t is returned untouched.
export const useTranslate = (namespace?: string) => {
  const t = useTranslations(namespace);
  const { isEditMode } = useEditMode();

  // Keeps t as stable as next-intl's own: hooks listing it as a dependency
  // (effects committing mutations, toasts...) must not re-run every render.
  return useMemo(
    () => (isEditMode ? withContentKeyMarkers(t, namespace) : t),
    [t, isEditMode, namespace]
  );
};
