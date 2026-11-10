import { buildEpicListVariables } from '@/components/epic/epic-list-query';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { getQueryClient } from '@/lib/query-client';
import { useEpicsQuery } from '@graphql/generated';
import { epicKeys } from '@graphql/xtm-platform-roadmap/epic.keys';
import {
  dehydrate,
  DehydratedState,
  HydrationBoundary,
} from '@tanstack/react-query';
import { ReactNode } from 'react';

/**
 * Fetches the epic list that `EpicPage` reads, under the same key. It never
 * rejects: a failed prefetch is not dehydrated and the client fetches it again.
 *
 * The query is public but its result depends on the visitor (drafts are only
 * returned to those who can edit the roadmap), so it is fetched with the
 * visitor's cookies and never from the shared data cache.
 */
export const prefetchEpicList = async (): Promise<DehydratedState> => {
  const queryClient = getQueryClient();
  const variables = buildEpicListVariables();

  await queryClient.prefetchQuery({
    queryKey: epicKeys.list(variables),
    queryFn: useEpicsQuery.fetcher(
      await getAuthenticatedGraphqlClient(),
      variables
    ),
  });

  return dehydrate(queryClient);
};

interface PrefetchedEpicListProps {
  children: ReactNode;
  /** A prefetch the page already started, to run it alongside its other fetches. */
  dehydratedState?: Promise<DehydratedState>;
}

/**
 * Server-renders the roadmap with its epics instead of a skeleton. Render it
 * inside a `Suspense` boundary so the rest of the page streams before the
 * epics arrive.
 */
export const PrefetchedEpicList = async ({
  children,
  dehydratedState,
}: PrefetchedEpicListProps) => (
  <HydrationBoundary state={await (dehydratedState ?? prefetchEpicList())}>
    {children}
  </HydrationBoundary>
);
