import { isLocale, toGraphqlLocale } from '@/i18n/graphql-locale';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import { loadContentTranslationDrafts } from '@/utils/content-translation/content-translation-drafts.server';
import {
  applyMessageOverrides,
  Messages,
} from '@/utils/content-translation/message-overrides';
import {
  ContentTranslationKeysDocument,
  ContentTranslationKeysQuery,
  ContentTranslationsByLocaleDocument,
  ContentTranslationsByLocaleQuery,
  ContentTranslationsByLocaleQueryVariables,
  Locale as GraphqlLocale,
} from '@graphql/generated';
import { cache } from 'react';

export const CONTENT_TRANSLATIONS_CACHE_TAG = 'content-translations';

// Bounds how long a publish made through the API, or on another instance
// than the one expiring the tag, stays unseen.
const CONTENT_TRANSLATIONS_REVALIDATE_SECONDS = 60;

// Editors bypass the Data Cache so a saved value shows up on their next
// render.
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

// Drafts come last so they win: editors preview them like published values.
const loadLocaleOverrides = async (locale: GraphqlLocale) => {
  const [published, drafts] = await Promise.all([
    // The committed messages are a complete fallback.
    fetchContentTranslationOverrides(locale).catch(() => []),
    loadContentTranslationDrafts(),
  ]);
  return [...published, ...drafts.filter((draft) => draft.locale === locale)];
};

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

// Any locale, not only the rendered one. Editors only, read uncached.
export const loadOverriddenContentKeys = async (): Promise<string[]> => {
  if (!(await isContentEditModeActive())) {
    return [];
  }
  const [published, drafts] = await Promise.all([
    serverGraphqlFetch<ContentTranslationKeysQuery>(
      ContentTranslationKeysDocument,
      {},
      { cache: 'no-store' }
    )
      .then((data) => data.contentTranslations)
      .catch(() => []),
    loadContentTranslationDrafts(),
  ]);
  return [...new Set([...published, ...drafts].map(({ key }) => key))];
};
