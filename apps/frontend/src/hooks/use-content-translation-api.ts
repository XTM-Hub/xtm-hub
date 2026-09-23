'use client';

import { Locale } from '@/i18n/config';
import { fromGraphqlLocale, toGraphqlLocale } from '@/i18n/graphql-locale';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  Locale as GraphqlLocale,
  useContentTranslationForKeyQuery,
  useSaveContentTranslationDraftMutation,
} from '@graphql/generated';
import { useCallback } from 'react';

export interface EditableTranslationValue {
  locale: Locale;
  value: string;
}

export interface ContentKeyValues {
  published: EditableTranslationValue[];
  drafts: EditableTranslationValue[];
}

const toEditableValues = (
  entries: { locale: GraphqlLocale; value: string }[]
): EditableTranslationValue[] =>
  entries.map(({ locale, value }) => ({
    locale: fromGraphqlLocale(locale),
    value,
  }));

// react-query plumbing for content translations, keyed by a fully-qualified
// content key (e.g. "PublicHomePage.XtmPlatform.Title").
export const useContentTranslationApi = () => {
  const { mutateAsync, isPending: isSaving } =
    useSaveContentTranslationDraftMutation(portalGraphqlClient);

  // Fetched imperatively when the dialog opens, not on mount, hence the
  // generated fetcher rather than the useQuery hook.
  const loadValuesForKey = useCallback(
    async (contentKey: string): Promise<ContentKeyValues> => {
      const data = await useContentTranslationForKeyQuery.fetcher(
        portalGraphqlClient,
        { keys: [contentKey] }
      )();
      return {
        published: toEditableValues(data.contentTranslations),
        drafts: toEditableValues(data.contentTranslationDrafts),
      };
    },
    []
  );

  const saveDraft = useCallback(
    async (
      contentKey: string,
      values: EditableTranslationValue[]
    ): Promise<void> => {
      await mutateAsync({
        input: {
          key: contentKey,
          values: values.map(({ locale, value }) => ({
            locale: toGraphqlLocale(locale),
            value,
          })),
        },
      });
    },
    [mutateAsync]
  );

  return { loadValuesForKey, saveDraft, isSaving };
};
