import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import {
  ContentTranslationDraftsDocument,
  ContentTranslationDraftsQuery,
} from '@graphql/generated';
import { cache } from 'react';

// Read uncached so a saved draft shows up right away.
export const loadContentTranslationDrafts = cache(
  async (): Promise<
    ContentTranslationDraftsQuery['contentTranslationDrafts']
  > => {
    if (!(await isContentEditModeActive())) {
      return [];
    }
    try {
      const client = await getAuthenticatedGraphqlClient();
      const data = await client.request<ContentTranslationDraftsQuery>(
        ContentTranslationDraftsDocument
      );
      return data.contentTranslationDrafts;
    } catch {
      return [];
    }
  }
);
