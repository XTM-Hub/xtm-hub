import { FeatureVotingCallout } from '@/components/feature-voting/FeatureVotingCallout';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  CurrentVotingRoundCalloutQuery,
  VotingRoundTheme,
} from '@graphql/generated';
import { mockVotingRound } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

const GQL_OPERATION_CALLOUT = 'CurrentVotingRoundCallout';

const PUBLIC_ROADMAP_PATH = '/en/cybersecurity-solutions/xtm-platform-roadmap';
const PRIVATE_ROADMAP_PATH = '/app/service/xtm_platform_roadmap/instance-1';

const mockCurrentRound = (
  currentVotingRound: CurrentVotingRoundCalloutQuery['currentVotingRound']
) =>
  mswServer.use(
    mockGraphqlQuery<CurrentVotingRoundCalloutQuery>({
      queryName: GQL_OPERATION_CALLOUT,
      data: { currentVotingRound },
    })
  );

const openRound = (theme: VotingRoundTheme, description: string | null) =>
  mockVotingRound({
    id: 'round-1',
    name: 'Feature vote #1',
    description,
    theme,
  });

describe('FeatureVotingCallout', () => {
  it('should invite to vote and link to the public page when a round is open', async () => {
    // Given the roadmap is browsed from its public route
    vi.mocked(usePathname).mockReturnValue(PUBLIC_ROADMAP_PATH);
    mockCurrentRound(
      openRound(VotingRoundTheme.Default, 'Tell us what matters to you')
    );

    // When
    testRender(<FeatureVotingCallout serviceInstanceId="instance-1" />);

    // Then
    const link = await screen.findByRole('link', {
      name: 'FeatureVoting.CalloutButton',
    });
    expect(link).toHaveAttribute(
      'href',
      '/en/cybersecurity-solutions/xtm-platform-roadmap/feature-voting'
    );
    expect(screen.getByText('Tell us what matters to you')).toBeInTheDocument();
  });

  it('should hide the decorative campaign icon from assistive technology', async () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(PUBLIC_ROADMAP_PATH);
    mockCurrentRound(openRound(VotingRoundTheme.Default, null));

    // When
    const { container } = testRender(
      <FeatureVotingCallout serviceInstanceId="instance-1" />
    );

    // Then
    await screen.findByText('FeatureVoting.CalloutTitle');
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('should link to the private page when the roadmap is browsed while logged in', async () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(PRIVATE_ROADMAP_PATH);
    mockCurrentRound(openRound(VotingRoundTheme.Default, null));

    // When
    testRender(<FeatureVotingCallout serviceInstanceId="instance-1" />);

    // Then
    expect(
      await screen.findByRole('link', { name: 'FeatureVoting.CalloutButton' })
    ).toHaveAttribute(
      'href',
      '/app/service/xtm_platform_roadmap/instance-1/feature-voting'
    );
  });

  it.each`
    theme                       | hasMosaic | description
    ${VotingRoundTheme.Default} | ${false}  | ${'the neutral identity stays flat'}
    ${VotingRoundTheme.Thread}  | ${true}   | ${'the Thread identity adds its mosaic'}
  `(
    'should dress the banner with the $theme identity ($description)',
    async ({ theme, hasMosaic }) => {
      // Given
      vi.mocked(usePathname).mockReturnValue(PUBLIC_ROADMAP_PATH);
      mockCurrentRound(openRound(theme, 'Tell us what matters to you'));

      // When
      testRender(<FeatureVotingCallout serviceInstanceId="instance-1" />);

      // Then
      const banner = (
        await screen.findByText('FeatureVoting.CalloutTitle')
      ).closest('div[class*="rounded"]');
      const style = banner?.getAttribute('style') ?? '';
      expect(style.includes('conic-gradient')).toBe(hasMosaic);
    }
  );

  // The roadmap must never advertise a vote that would land on an empty page.
  it('should render nothing when no round is collecting votes', async () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(PUBLIC_ROADMAP_PATH);
    mockCurrentRound(null);

    // When
    const { container } = testRender(
      <FeatureVotingCallout serviceInstanceId="instance-1" />
    );

    // Then
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(
      screen.queryByRole('link', { name: 'FeatureVoting.CalloutButton' })
    ).not.toBeInTheDocument();
  });
});
