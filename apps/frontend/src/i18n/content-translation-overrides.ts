import { isLocale, toGraphqlLocale } from '@/i18n/graphql-locale';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
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

export const CONTENT_TRANSLATIONS_CACHE_TAG = 'content-translations';

// Editors bypass the Data Cache so a saved value shows up on their next
// render; everyone else shares the cached overrides, expired on save (see
// revalidate-content-translations.actions.ts) or after the revalidate window.
const fetchContentTranslationOverrides = async (locale: GraphqlLocale) => {
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
            revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
            tags: [CONTENT_TRANSLATIONS_CACHE_TAG],
          },
        }
  );
  return data.contentTranslations;
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
  try {
    const overrides = await fetchContentTranslationOverrides(
      toGraphqlLocale(locale)
    );
    return applyMessageOverrides(messages, overrides);
  } catch {
    // An unreachable backend must never break rendering: the committed
    // messages are a complete fallback.
    return messages;
  }
};
