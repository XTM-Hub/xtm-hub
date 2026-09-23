'use client';

import { portalGraphqlClient } from '@/lib/graphql-client';
import revalidateContentTranslationsAction from '@/utils/actions/revalidate-content-translations.actions';
import {
  useDiscardContentTranslationDraftsMutation,
  usePublishContentTranslationDraftsMutation,
} from '@graphql/generated';
import { useCallback } from 'react';

// Callers re-render the route afterwards: drafts only ever reach the page
// through the server-side message overlay.
export const useContentTranslationDrafts = () => {
  const publishMutation =
    usePublishContentTranslationDraftsMutation(portalGraphqlClient);
  const discardMutation =
    useDiscardContentTranslationDraftsMutation(portalGraphqlClient);
  const { mutateAsync: publish } = publishMutation;
  const { mutateAsync: discard } = discardMutation;

  const publishDrafts = useCallback(async () => {
    await publish({});
    // Published values are the only ones visitors read, through the cache.
    await revalidateContentTranslationsAction();
  }, [publish]);

  const discardDrafts = useCallback(async () => {
    await discard({});
  }, [discard]);

  return {
    publishDrafts,
    discardDrafts,
    isPending: publishMutation.isPending || discardMutation.isPending,
  };
};
