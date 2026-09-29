import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import { withContentKeyMarkers } from '@/utils/content-translation/with-content-key-markers';
import { getTranslations } from 'next-intl/server';

type GetTranslateOptions =
  string | { locale: string; namespace?: string } | undefined;

// Server Component counterpart to useTranslate(). EditModeContentObserver
// scans the final DOM, so markers work whether the text came from a Server or
// a Client Component. Never use it for metadata or JSON-LD: nothing strips
// markers there.
export const getTranslate = async (options?: GetTranslateOptions) => {
  // Identical branches on purpose: each resolves a different overload.
  const t =
    typeof options === 'string'
      ? await getTranslations(options)
      : await getTranslations(options);

  if (!(await isContentEditModeActive())) {
    return t;
  }

  const namespace = typeof options === 'string' ? options : options?.namespace;
  return withContentKeyMarkers(t, namespace);
};
