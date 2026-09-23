import { isLocale, toGraphqlLocale } from '@/i18n/graphql-locale';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import { loadContentTranslationDrafts } from '@/utils/content-translation/content-translation-drafts.server';
import {
  applyMessageOverrides,
  Messages,
} from '@/utils/content-translation/message-overrides';
import {
  ContentTranslationsByLocaleDocument,
  ContentTranslationsByLocaleQuery,
  ContentTranslationsByLocaleQueryVariables,
  Locale as GraphqlLocale,
} from '@graphql/generated';
import { cache } from 'react';

export const CONTENT_TRANSLATIONS_CACHE_TAG = 'content-translations';

// Publishing from the edit mode banner expires the tag at once; this bounds
// how long a publish made straight through the API, or served by another
// instance than the one that expired the tag, can stay unseen.
const CONTENT_TRANSLATIONS_REVALIDATE_SECONDS = 60;

// Editors bypass the Data Cache so a saved value shows up on their next
// render; everyone else shares the cached overrides, expired on publish (see
// publish-content-translation-drafts.actions.ts) or after the revalidate
// window.
// Memoized per request: the i18n config and the layouts both read it.
const fetchContentTranslationOverrides = cache(
  async (locale: GraphqlLocale) => {
    const isEditMode = await isContentEditModeActive();
    const data = await serverGraphqlFetch<
      ContentTranslationsByLocaleQuery,
      ContentTranslationsByLocaleQueryVariables
    >(
      ContentTranslationsByLocaleDocument,
      { locale },
      isEditMode
        ? { cache: 'no-store' }
        : {
            cache: undefined,
            next: {
              revalidate: CONTENT_TRANSLATIONS_REVALIDATE_SECONDS,
              tags: [CONTENT_TRANSLATIONS_CACHE_TAG],
            },
          }
    );
    return data.contentTranslations;
  }
);

// Published overrides then, in edit mode, drafts: later entries win, so
// editors preview their pending changes rendered like live ones.
const loadLocaleOverrides = async (locale: GraphqlLocale) => {
  const [published, drafts] = await Promise.all([
    // An unreachable backend must never break rendering: the committed
    // messages are a complete fallback.
    fetchContentTranslationOverrides(locale).catch(() => []),
    loadContentTranslationDrafts(),
  ]);
  return [...published, ...drafts.filter((draft) => draft.locale === locale)];
};

// Overlays DB-backed overrides (edited in context, see
// EditModeContentObserver) on the committed next-intl messages, for every
// t() call, server or client.
export const withContentTranslationOverrides = async (
  locale: string,
  messages: Messages
): Promise<Messages> => {
  if (!isLocale(locale)) {
    return messages;
  }
  return applyMessageOverrides(
    messages,
    await loadLocaleOverrides(toGraphqlLocale(locale))
  );
};

// Keys rendered from a draft or a published override rather than the
// committed messages, so edit mode can tell them apart.
export const loadOverriddenContentKeys = async (
  locale: string
): Promise<string[]> => {
  if (!isLocale(locale) || !(await isContentEditModeActive())) {
    return [];
  }
  const overrides = await loadLocaleOverrides(toGraphqlLocale(locale));
  return [...new Set(overrides.map(({ key }) => key))];
};
