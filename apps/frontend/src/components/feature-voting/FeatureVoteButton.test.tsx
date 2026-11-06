import { FeatureVoteButton } from '@/components/feature-voting/FeatureVoteButton';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { FeatureVoteMutation } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { usePathname, useRouter } from 'next/navigation';

const GQL_OPERATION_FEATURE_VOTE = 'FeatureVote';
const FEATURE = { id: 'feature-1', title: 'AI-powered report triage' };
const PRIVATE_FEATURE_VOTING_PATH =
  '/app/service/xtm_platform_roadmap/instance-1/feature-voting?voteFeatureId=feature-1';

const { showSnackbarMock } = vi.hoisted(() => ({ showSnackbarMock: vi.fn() }));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

const mockVoteSuccess = () =>
  mswServer.use(
    mockGraphqlMutation<FeatureVoteMutation>({
      queryName: GQL_OPERATION_FEATURE_VOTE,
      data: { voteForFeature: { id: 'feature-1', has_my_vote: true } },
    })
  );

const mockVoteError = (message: string) =>
  mswServer.use(
    mockGraphqlMutation({
      queryName: GQL_OPERATION_FEATURE_VOTE,
      errors: [{ message }],
    })
  );

const mockVoteSuccessOnRelease = () => {
  const release = Promise.withResolvers<void>();
  mswServer.use(
    graphql.mutation<FeatureVoteMutation>(
      GQL_OPERATION_FEATURE_VOTE,
      async () => {
        await release.promise;
        return HttpResponse.json({
          data: { voteForFeature: { id: FEATURE.id, has_my_vote: true } },
        });
      }
    )
  );
  return release.resolve;
};

describe('FeatureVoteButton', () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
  });

  // An anonymous visitor must be sent to log in and land on the private page
  // (never on the public page) so their vote can be cast once they land there.
  it('should redirect to sign up on the private page instead of voting when not authenticated', async () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(
      '/en/cybersecurity-solutions/xtm-platform-roadmap/feature-voting'
    );
    const { user } = testRender(
      <FeatureVoteButton
        feature={FEATURE}
        serviceInstanceId="instance-1"
        hasMyVote={false}
        isAuthenticated={false}
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'FeatureVoting.Vote' })
    );

    // Then
    expect(push).toHaveBeenCalledWith(
      `/sign-up?redirect=${encodeURIComponent(btoa(PRIVATE_FEATURE_VOTING_PATH))}`
    );
    expect(showSnackbarMock).not.toHaveBeenCalled();
  });

  // A visitor already logged in on the public page must still be routed to
  // the private page: voting never happens on the public page.
  it('should navigate to the private page without voting when authenticated on the public page', async () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(
      '/en/cybersecurity-solutions/xtm-platform-roadmap/feature-voting'
    );
    const { user } = testRender(
      <FeatureVoteButton
        feature={FEATURE}
        serviceInstanceId="instance-1"
        hasMyVote={false}
        isAuthenticated
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'FeatureVoting.Vote' })
    );

    // Then
    expect(push).toHaveBeenCalledWith(PRIVATE_FEATURE_VOTING_PATH);
    expect(showSnackbarMock).not.toHaveBeenCalled();
  });

  it('should confirm with a toast when the vote is recorded on the private page', async () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(
      '/app/service/xtm_platform_roadmap/instance-1/feature-voting'
    );
    mockVoteSuccess();
    const { user } = testRender(
      <FeatureVoteButton
        feature={FEATURE}
        serviceInstanceId="instance-1"
        hasMyVote={false}
        isAuthenticated
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'FeatureVoting.Vote' })
    );

    // Then
    await vi.waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          title: 'FeatureVoting.VoteRecordedTitle',
        })
      )
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('should surface the server error code when the vote is rejected', async () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(
      '/app/service/xtm_platform_roadmap/instance-1/feature-voting'
    );
    mockVoteError('VOTING_ROUND_NOT_OPEN');
    const { user } = testRender(
      <FeatureVoteButton
        feature={FEATURE}
        serviceInstanceId="instance-1"
        hasMyVote={false}
        isAuthenticated
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'FeatureVoting.Vote' })
    );

    // Then
    await vi.waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' })
      )
    );
  });

  it('should disable the button and show the voted state when the feature already has my vote', () => {
    // Given / When
    vi.mocked(usePathname).mockReturnValue(
      '/app/service/xtm_platform_roadmap/instance-1/feature-voting'
    );
    testRender(
      <FeatureVoteButton
        feature={FEATURE}
        serviceInstanceId="instance-1"
        hasMyVote
        isAuthenticated
      />
    );

    // Then
    expect(
      screen.getByRole('button', { name: /FeatureVoting.Voted/ })
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'FeatureVoting.Vote' })
    ).not.toBeInTheDocument();
  });

  it('should not send a feature vote when the vote is rejected', async () => {
    // Given
    startAnalytics();
    vi.mocked(usePathname).mockReturnValue(
      '/app/service/xtm_platform_roadmap/instance-1/feature-voting'
    );
    mockVoteError('VOTING_ROUND_NOT_OPEN');
    const { user } = testRender(
      <FeatureVoteButton
        feature={FEATURE}
        serviceInstanceId="instance-1"
        hasMyVote={false}
        isAuthenticated
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'FeatureVoting.Vote' })
    );

    // Then
    await vi.waitFor(() => expect(showSnackbarMock).toHaveBeenCalled());
    expect(readTrackedEvents('feature_vote')).toEqual([]);
  });

  it('should send the feature vote when the button is gone before the vote is recorded', async () => {
    // Given
    startAnalytics();
    vi.mocked(usePathname).mockReturnValue(
      '/app/service/xtm_platform_roadmap/instance-1/feature-voting'
    );
    const releaseVote = mockVoteSuccessOnRelease();
    const { user, unmount } = testRender(
      <FeatureVoteButton
        feature={FEATURE}
        serviceInstanceId="instance-1"
        hasMyVote={false}
        isAuthenticated
      />
    );
    await user.click(
      screen.getByRole('button', { name: 'FeatureVoting.Vote' })
    );
    unmount();

    // When
    releaseVote();

    // Then
    await vi.waitFor(() =>
      expect(readTrackedEvents('feature_vote')).toEqual([
        { feature_name: FEATURE.title },
      ])
    );
  });
});
