'use server';
import { CONTENT_TRANSLATIONS_CACHE_TAG } from '@/i18n/content-translation-overrides';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import {
  PublishContentTranslationDraftsDocument,
  PublishContentTranslationDraftsMutation,
} from '@graphql/generated';
import { updateTag } from 'next/cache';

/**
 * Publishes and expires the cached overrides in one server-side step, so a
 * publish is never left behind a stale cache. The mutation enforces BYPASS.
 */
export default async function publishContentTranslationDraftsAction() {
  const client = await getAuthenticatedGraphqlClient();
  await client.request<PublishContentTranslationDraftsMutation>(
    PublishContentTranslationDraftsDocument
  );
  updateTag(CONTENT_TRANSLATIONS_CACHE_TAG);
}
