import { FeatureVotingItem } from '@/components/feature-voting/FeatureVotingItem';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  FeatureVoteMutation,
  FiligranProduct,
  VotableFeaturePublicFragment,
} from '@graphql/generated';
import { mockVotableFeature } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const feature: VotableFeaturePublicFragment = mockVotableFeature({
  id: 'feature-1',
  title: 'AI-powered report triage',
  short_description: 'Automatically extract entities from reports.',
  description: 'Long description of the feature',
  product: FiligranProduct.Opencti,
  use_cases: [{ id: 'use-case-1', name: 'Threat hunting', color: '#001122' }],
  illustration_document_id: null,
  position: 1,
  has_my_vote: false,
});

const mockSearchParams = (featureId: string | null) => {
  vi.mocked(useSearchParams).mockReturnValue({
    get: vi.fn().mockReturnValue(featureId),
    toString: vi
      .fn()
      .mockReturnValue(featureId ? `featureId=${featureId}` : ''),
  } as unknown as ReturnType<typeof useSearchParams>);
};

describe('FeatureVotingItem', () => {
  const replaceState = vi.spyOn(window.history, 'replaceState');

  beforeEach(() => {
    replaceState.mockImplementation(() => {});
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
    vi.mocked(usePathname).mockReturnValue('/en/feature-voting');
    mockSearchParams(null);
    mswServer.use(
      mockGraphqlMutation<FeatureVoteMutation>({
        queryName: 'FeatureVote',
        data: {
          voteForFeature: { id: 'feature-1', has_my_vote: true },
        },
      })
    );
  });

  it('should put the feature id in the URL when clicking the card', async () => {
    const { user } = testRender(
      <FeatureVotingItem
        feature={feature}
        serviceInstanceId="instance-1"
        isAuthenticated
      />
    );

    await user.click(screen.getByText('AI-powered report triage'));

    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/en/feature-voting?featureId=feature-1'
    );
  });

  // Voting is the primary action of the card: it must not be hijacked by the
  // detail dialog.
  it('should not open the detail when clicking the vote button', async () => {
    const { user } = testRender(
      <FeatureVotingItem
        feature={feature}
        serviceInstanceId="instance-1"
        isAuthenticated
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'FeatureVoting.Vote' })
    );

    expect(replaceState).not.toHaveBeenCalled();
  });

  it('should open the detail from the keyboard through the title', async () => {
    const { user } = testRender(
      <FeatureVotingItem
        feature={feature}
        serviceInstanceId="instance-1"
        isAuthenticated
      />
    );

    await user.tab();
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('button', { name: 'AI-powered report triage' })
    ).toHaveFocus();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/en/feature-voting?featureId=feature-1'
    );
  });

  it('should render the detail and its long description when the URL selects the feature', () => {
    mockSearchParams('feature-1');

    testRender(
      <FeatureVotingItem
        feature={feature}
        serviceInstanceId="instance-1"
        isAuthenticated
      />
    );

    expect(
      screen.getByRole('heading', { name: 'AI-powered report triage' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Long description of the feature')
    ).toBeInTheDocument();
  });

  it('should drop the feature id from the URL when closing the detail', async () => {
    mockSearchParams('feature-1');

    const { user } = testRender(
      <FeatureVotingItem
        feature={feature}
        serviceInstanceId="instance-1"
        isAuthenticated
      />
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(replaceState).toHaveBeenCalledWith(null, '', '/en/feature-voting');
  });
});
