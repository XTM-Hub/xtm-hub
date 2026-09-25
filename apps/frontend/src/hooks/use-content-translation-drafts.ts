'use client';

import { portalGraphqlClient } from '@/lib/graphql-client';
import publishContentTranslationDraftsAction from '@/utils/actions/publish-content-translation-drafts.actions';
import { useDiscardContentTranslationDraftsMutation } from '@graphql/generated';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

// Callers re-render the route afterwards: drafts only ever reach the page
// through the server-side message overlay.
export const useContentTranslationDrafts = () => {
  // A Server Action, so publishing and expiring the cache happen together.
  const publishMutation = useMutation({
    mutationFn: () => publishContentTranslationDraftsAction(),
  });
  const discardMutation =
    useDiscardContentTranslationDraftsMutation(portalGraphqlClient);
  const { mutateAsync: publish } = publishMutation;
  const { mutateAsync: discard } = discardMutation;

  const publishDrafts = useCallback(async () => {
    await publish();
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
