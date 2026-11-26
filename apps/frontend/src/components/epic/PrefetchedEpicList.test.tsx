import { EpicPage } from '@/components/epic/EpicPage';
import { PrefetchedEpicList } from '@/components/epic/PrefetchedEpicList';
import { createQueryClient } from '@/lib/query-client';
import testRender from '@/utils/test/test-render';
import {
  CurrentVotingRoundCalloutQuery,
  EpicsQuery,
  Timeline,
} from '@graphql/generated';
import { mockEpic, mockSeoServiceInstance } from '@graphql/mocks';
import { epicKeys } from '@graphql/xtm-platform-roadmap/epic.keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLClient } from 'graphql-request';
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';
import { RequestCookiesAdapter } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { cookies } from 'next/headers';
import { Component, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  // What the server prefetch fetches, through `useEpicsQuery.fetcher`.
  serverFetch: vi.fn(),
  // What the client hook fetches when it does not find the prefetched data.
  clientFetch: vi.fn(),
  useCurrentVotingRoundCalloutQuery: vi.fn(),
  // jsdom is not a server, so the clients would retry a failed load with a
  // back-off: the server client never retries, and the tests skip it on the client.
  withoutRetry: <T extends import('@tanstack/react-query').QueryClient>(
    queryClient: T
  ) => {
    queryClient.setDefaultOptions({
      queries: { ...queryClient.getDefaultOptions().queries, retry: false },
    });
    return queryClient;
  },
}));

// The epics hook keeps the real react-query behaviour under test (hydration,
// key, throwOnError) and only has its fetches replaced.
vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  const useEpicsQuery = Object.assign(
    (
      ...[client, variables, options]: Parameters<typeof actual.useEpicsQuery>
    ) =>
      actual.useEpicsQuery(client, variables, {
        ...options,
        queryFn: mocks.clientFetch,
      }),
    {
      fetcher:
        (...args: Parameters<typeof actual.useEpicsQuery.fetcher>) =>
        () =>
          mocks.serverFetch(...args),
    }
  );
  return mockGeneratedQueryHooks(importOriginal, {
    useEpicsQuery,
    useCurrentVotingRoundCalloutQuery: mocks.useCurrentVotingRoundCalloutQuery,
  });
});

// A new client per call, as on the server, so the prefetch never lands in the
// client the page renders with.
vi.mock('@/lib/query-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/query-client')>();
  return {
    ...actual,
    getQueryClient: () => mocks.withoutRetry(actual.createQueryClient()),
  };
});

const VISITOR_COOKIE = 'xtm-hub-session=visitor-session';
const ERROR_PAGE_TEXT = 'error page';
const EPICS_ERROR = 'EPICS_UNAVAILABLE';
const SEARCH_PLACEHOLDER = 'GenericActions.Search';
const SEARCH_TERM = 'road';

const NOW_EPIC = mockEpic({
  id: 'epic-1',
  title: 'Now epic',
  timeline: Timeline.Now,
  active: true,
});

const EPICS: EpicsQuery = {
  epics: { totalCount: 1, edges: [{ node: NOW_EPIC }] },
};

const NO_VOTING_ROUND: CurrentVotingRoundCalloutQuery = {
  currentVotingRound: null,
};

const serviceInstance = mockSeoServiceInstance({ id: 'service-instance-1' });

// Stands in for the Next.js error page a thrown query reaches.
class ErrorPage extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    const { hasError } = this.state;
    const { children } = this.props;
    return hasError ? <p>{ERROR_PAGE_TEXT}</p> : children;
  }
}

const givenVisitorCookie = () =>
  vi
    .mocked(cookies)
    .mockResolvedValue(
      RequestCookiesAdapter.seal(
        new RequestCookies(new Headers({ cookie: VISITOR_COOKIE }))
      )
    );

const prefetchedClient = (): GraphQLClient =>
  mocks.serverFetch.mock.lastCall?.[0];

const waitForClientQueries = (queryClient: QueryClient) =>
  waitFor(() => expect(queryClient.isFetching()).toBe(0));

const renderPrefetchedPage = async () => {
  const page = await PrefetchedEpicList({
    children: <EpicPage serviceInstance={serviceInstance} />,
  });
  const queryClient = mocks.withoutRetry(createQueryClient());
  testRender(
    <QueryClientProvider client={queryClient}>
      <ErrorPage>{page}</ErrorPage>
    </QueryClientProvider>
  );
  return queryClient;
};

describe('PrefetchedEpicList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    givenVisitorCookie();
    mocks.serverFetch.mockResolvedValue(EPICS);
    mocks.clientFetch.mockResolvedValue(EPICS);
    mocks.useCurrentVotingRoundCalloutQuery.mockReturnValue({
      data: NO_VOTING_ROUND,
      isLoading: false,
    });
  });

  it('should render the prefetched epics without a loading state', async () => {
    // When
    await renderPrefetchedPage();

    // Then
    expect(screen.getByText(NOW_EPIC.title)).toBeInTheDocument();
  });

  it('should prefetch the epics with the visitor cookies', async () => {
    // When
    await renderPrefetchedPage();

    // Then
    expect(prefetchedClient().requestConfig.headers).toMatchObject({
      cookie: VISITOR_COOKIE,
    });
  });

  it('should not load the epics again on the client when the prefetched key matches the client one', async () => {
    // Given
    const queryClient = await renderPrefetchedPage();

    // When
    await waitForClientQueries(queryClient);

    // Then
    expect(mocks.clientFetch).not.toHaveBeenCalled();
  });

  it('should show the error page when the epics cannot be loaded', async () => {
    // Given
    mocks.serverFetch.mockRejectedValue(new Error(EPICS_ERROR));
    mocks.clientFetch.mockRejectedValue(new Error(EPICS_ERROR));

    // When
    await renderPrefetchedPage();

    // Then
    expect(await screen.findByText(ERROR_PAGE_TEXT)).toBeInTheDocument();
  });

  it('should keep the epics on screen when refreshing them fails', async () => {
    // Given
    const queryClient = await renderPrefetchedPage();
    mocks.clientFetch.mockRejectedValue(new Error(EPICS_ERROR));

    // When
    await act(() =>
      queryClient.invalidateQueries({ queryKey: epicKeys.all() })
    );
    await waitForClientQueries(queryClient);

    // Then
    expect(screen.getByText(NOW_EPIC.title)).toBeInTheDocument();
  });

  it('should show the error page when a search fails', async () => {
    // Given
    const user = userEvent.setup();
    await renderPrefetchedPage();
    mocks.clientFetch.mockRejectedValue(new Error(EPICS_ERROR));

    // When
    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      SEARCH_TERM
    );

    // Then
    expect(await screen.findByText(ERROR_PAGE_TEXT)).toBeInTheDocument();
  });
});
