'use server';
import { CONTENT_TRANSLATIONS_CACHE_TAG } from '@/i18n/content-translation-overrides';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import {
  PublishContentTranslationDraftsDocument,
  PublishContentTranslationDraftsMutation,
} from '@graphql/generated';
import { updateTag } from 'next/cache';

/**
 * Publishes every draft and expires the cached overrides in one server-side
 * step, so a successful publish is never left behind a stale cache. The
 * mutation itself enforces the BYPASS capability. Uses `updateTag` for
 * read-your-own-writes, like revalidate-document-slugs.actions.ts.
 */
export default async function publishContentTranslationDraftsAction() {
  const client = await getAuthenticatedGraphqlClient();
  await client.request<PublishContentTranslationDraftsMutation>(
    PublishContentTranslationDraftsDocument
  );
  updateTag(CONTENT_TRANSLATIONS_CACHE_TAG);
}
