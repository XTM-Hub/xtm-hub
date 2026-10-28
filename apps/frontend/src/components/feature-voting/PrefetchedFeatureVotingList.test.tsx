import { PrefetchedFeatureVotingList } from '@/components/feature-voting/PrefetchedFeatureVotingList';
import { createQueryClient } from '@/lib/query-client';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { CurrentVotingRoundQuery, FiligranProduct } from '@graphql/generated';
import { mockVotableFeature, mockVotingRound } from '@graphql/mocks';
import { QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { graphql } from 'msw';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const GQL_OPERATION_CURRENT_ROUND = 'CurrentVotingRound';

// next/headers only exists in a request scope: forward no cookie instead.
vi.mock('@/lib/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql-client')>();
  return {
    ...actual,
    getAuthenticatedGraphqlClient: async () =>
      actual.createPortalGraphqlClient(),
  };
});

// jsdom is a browser: give each render the fresh, never-retrying client a
// server request gets.
vi.mock('@/lib/query-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/query-client')>();
  return {
    ...actual,
    getQueryClient: () => {
      const client = actual.createQueryClient();
      client.setDefaultOptions({
        queries: { ...client.getDefaultOptions().queries, retry: false },
      });
      return client;
    },
  };
});

const mockRound = (description: string) =>
  mswServer.use(
    mockGraphqlQuery<CurrentVotingRoundQuery>({
      queryName: GQL_OPERATION_CURRENT_ROUND,
      data: {
        me: { id: 'user-1' },
        currentVotingRound: mockVotingRound({
          id: 'round-1',
          description,
          features: [
            mockVotableFeature({
              id: 'feature-opencti',
              title: 'AI-powered report triage',
              product: FiligranProduct.Opencti,
              has_my_vote: false,
            }),
          ],
        }),
      },
    })
  );

// Returns nothing, so MSW falls through to the handler that answers.
const countRoundRequests = () => {
  const counter = { requests: 0 };
  mswServer.use(
    graphql.query(GQL_OPERATION_CURRENT_ROUND, () => {
      counter.requests += 1;
    })
  );
  return counter;
};

const prefetchList = () =>
  PrefetchedFeatureVotingList({
    serviceInstanceId: 'instance-1',
    roadmapHref: '/app/service/xtm_platform_roadmap/instance-1',
  });

describe('PrefetchedFeatureVotingList', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
    vi.mocked(usePathname).mockReturnValue('/en/feature-voting');
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    } as unknown as ReturnType<typeof useSearchParams>);
  });

  it('should render the prefetched round on the first render', async () => {
    // Given
    mockRound('Tell us what matters to you');

    // When
    testRender(await prefetchList());

    // Then
    expect(screen.getByText('Tell us what matters to you')).toBeInTheDocument();
    expect(screen.getByText('AI-powered report triage')).toBeInTheDocument();
  });

  it('should not refetch the prefetched round when the list mounts', async () => {
    // Given
    mockRound('Tell us what matters to you');
    const prefetchedList = await prefetchList();
    const counter = countRoundRequests();
    // testRender's client has a zero stale time: use the production one.
    const queryClient = createQueryClient();

    // When
    testRender(
      <QueryClientProvider client={queryClient}>
        {prefetchedList}
      </QueryClientProvider>
    );

    // Then
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(counter.requests).toBe(0);
  });

  it('should fetch the round client-side when the prefetch fails', async () => {
    // Given
    mswServer.use(
      mockGraphqlQuery<CurrentVotingRoundQuery>({
        queryName: GQL_OPERATION_CURRENT_ROUND,
        errors: [{ message: 'INTERNAL_SERVER_ERROR' }],
      })
    );
    const prefetchedList = await prefetchList();
    mockRound('Fetched by the client');

    // When
    testRender(prefetchedList);

    // Then
    expect(
      await screen.findByText('Fetched by the client')
    ).toBeInTheDocument();
  });
});
