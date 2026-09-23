'use server';
import { CONTENT_TRANSLATIONS_CACHE_TAG } from '@/i18n/content-translation-overrides';
import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import { updateTag } from 'next/cache';

/**
 * Expires the cached content-translation overrides after an in-context edit,
 * so visitors get the saved value on their next request. Uses `updateTag`
 * for read-your-own-writes, like revalidate-document-slugs.actions.ts.
 * Restricted to editors: anyone can call a Server Action.
 */
export default async function revalidateContentTranslationsAction() {
  if (await isContentEditModeActive()) {
    updateTag(CONTENT_TRANSLATIONS_CACHE_TAG);
  }
}
