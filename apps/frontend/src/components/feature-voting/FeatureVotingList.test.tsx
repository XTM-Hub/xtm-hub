import { FeatureVotingList } from '@/components/feature-voting/FeatureVotingList';
import {
  mockGraphqlMutation,
  mockGraphqlQuery,
} from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  CurrentVotingRoundQuery,
  FeatureVoteMutation,
  FiligranProduct,
} from '@graphql/generated';
import { mockVotableFeature, mockVotingRound } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const GQL_OPERATION_CURRENT_ROUND = 'CurrentVotingRound';
const GQL_OPERATION_FEATURE_VOTE = 'FeatureVote';

const ROADMAP_HREF = '/app/service/xtm_platform_roadmap/instance-1';

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

vi.mock('@filigran/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/ui')>()),
  toast: toastMock,
}));

const openctiFeature = mockVotableFeature({
  id: 'feature-opencti',
  title: 'AI-powered report triage',
  product: FiligranProduct.Opencti,
  has_my_vote: false,
});

const openaevFeature = mockVotableFeature({
  id: 'feature-openaev',
  title: 'Scenario library',
  product: FiligranProduct.Openaev,
  has_my_vote: false,
});

const mockRound = (
  currentVotingRound: CurrentVotingRoundQuery['currentVotingRound'],
  me: CurrentVotingRoundQuery['me'] = { id: 'user-1' }
) =>
  mswServer.use(
    mockGraphqlQuery<CurrentVotingRoundQuery>({
      queryName: GQL_OPERATION_CURRENT_ROUND,
      data: { me, currentVotingRound },
    })
  );

const mockVoteSuccess = (featureId: string) =>
  mswServer.use(
    mockGraphqlMutation<FeatureVoteMutation>({
      queryName: GQL_OPERATION_FEATURE_VOTE,
      data: { voteForFeature: { id: featureId, has_my_vote: true } },
    })
  );

const mockSearchParams = (voteFeatureId: string | null) => {
  vi.mocked(useSearchParams).mockReturnValue({
    get: vi.fn().mockReturnValue(voteFeatureId),
    toString: vi
      .fn()
      .mockReturnValue(voteFeatureId ? `voteFeatureId=${voteFeatureId}` : ''),
  } as unknown as ReturnType<typeof useSearchParams>);
};

const renderList = () =>
  testRender(
    <FeatureVotingList
      serviceInstanceId="instance-1"
      roadmapHref={ROADMAP_HREF}
    />
  );

describe('FeatureVotingList', () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace,
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
    vi.mocked(usePathname).mockReturnValue('/en/feature-voting');
    mockSearchParams(null);
  });

  it('should group the features of the open round by product', async () => {
    // Given
    mockRound(
      mockVotingRound({
        id: 'round-1',
        name: 'Feature vote #1',
        description: 'Tell us what matters to you',
        features: [openctiFeature, openaevFeature],
      })
    );

    // When
    renderList();

    // Then
    expect(
      await screen.findByText('Tell us what matters to you')
    ).toBeInTheDocument();
    expect(screen.getByText('AI-powered report triage')).toBeInTheDocument();
    expect(screen.getByText('Scenario library')).toBeInTheDocument();
    // One reminder per product section that carries features.
    expect(screen.getAllByText('FeatureVoting.OneVotePerProduct')).toHaveLength(
      2
    );
  });

  // The page is reachable even between two rounds, it must stay readable.
  it('should explain that no round is collecting votes when there is none', async () => {
    // Given
    mockRound(null);

    // When
    renderList();

    // Then
    expect(
      await screen.findByText('FeatureVoting.NoOpenRound')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('FeatureVoting.OneVotePerProduct')
    ).not.toBeInTheDocument();
  });

  it('should let an anonymous visitor see the features', async () => {
    // Given
    mockRound(
      mockVotingRound({
        id: 'round-1',
        description: null,
        features: [openctiFeature],
      }),
      null
    );

    // When
    renderList();

    // Then
    expect(
      await screen.findByText('AI-powered report triage')
    ).toBeInTheDocument();
    expect(screen.getByText('FeatureVoting.Description')).toBeInTheDocument();
  });

  it('should link back to the roadmap the round belongs to', async () => {
    // Given
    mockRound(
      mockVotingRound({
        id: 'round-1',
        description: 'Tell us what matters to you',
        features: [openctiFeature],
      })
    );

    // When
    renderList();

    // Then
    expect(
      await screen.findByRole('link', { name: 'Epic.XTMRoadmap' })
    ).toHaveAttribute('href', ROADMAP_HREF);
  });

  // A visitor redirected here after voting from the public page (or after
  // logging in to vote) must have that original vote counted automatically.
  describe('auto-vote from redirect', () => {
    it('should cast the vote carried in the URL once and strip it from the URL', async () => {
      // Given
      mockSearchParams('feature-opencti');
      mockRound(
        mockVotingRound({
          id: 'round-1',
          description: 'Tell us what matters to you',
          features: [openctiFeature, openaevFeature],
        })
      );
      mockVoteSuccess('feature-opencti');

      // When
      renderList();

      // Then
      await vi.waitFor(() =>
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'FeatureVoting.VoteRecordedTitle' })
        )
      );
      expect(replace).toHaveBeenCalledWith('/en/feature-voting', {
        scroll: false,
      });
    });

    it('should not vote again when the feature already has my vote, but still strip the URL', async () => {
      // Given
      mockSearchParams('feature-opencti');
      mockRound(
        mockVotingRound({
          id: 'round-1',
          description: 'Tell us what matters to you',
          features: [
            mockVotableFeature({
              id: 'feature-opencti',
              title: 'AI-powered report triage',
              product: FiligranProduct.Opencti,
              has_my_vote: true,
            }),
          ],
        })
      );

      // When
      renderList();

      // Then
      await vi.waitFor(() =>
        expect(replace).toHaveBeenCalledWith('/en/feature-voting', {
          scroll: false,
        })
      );
      expect(toastMock).not.toHaveBeenCalled();
    });

    it('should not vote for an anonymous visitor', async () => {
      // Given
      mockSearchParams('feature-opencti');
      mockRound(
        mockVotingRound({
          id: 'round-1',
          description: 'Tell us what matters to you',
          features: [openctiFeature],
        }),
        null
      );

      // When
      renderList();

      // Then
      expect(
        (await screen.findAllByText('AI-powered report triage')).length
      ).toBeGreaterThan(0);
      expect(toastMock).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
    });
  });
});
