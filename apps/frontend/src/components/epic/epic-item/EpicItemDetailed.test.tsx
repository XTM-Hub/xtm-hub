import { EpicItemDetailed } from '@/components/epic/epic-item/EpicItemDetailed';
import { DEFAULT_EPIC_SLACK_LINK } from '@/components/epic/epic-slack-links';
import testRender from '@/utils/test/test-render';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { EditionType, EpicType, FiligranProduct } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('EpicItemDetailed', () => {
  const epic = (slackLink: string | null) =>
    ({
      id: 'epic-1',
      title: 'Roadmap epic',
      epic_type: EpicType.Other,
      edition_type: EditionType.CommunityEdition,
      product: [FiligranProduct.Opencti],
      slack_link: slackLink,
      short_description: 'short description',
      description: 'long **description**',
      document_id: null,
      active: true,
      timeline: 'now',
    }) as epic_fragment$data;

  const defaultProps = {
    epic: epic(null),
    serviceInstanceId: 'service-instance-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, markdown description and footer', () => {
    // Given
    const environment = createMockEnvironment();

    // When
    testRender(<EpicItemDetailed {...defaultProps} />, {
      relayConfig: environment,
    });

    // Then
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(defaultProps.epic.title);
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it.each`
    slackLink                                                      | expectedLink                                                   | description
    ${'https://filigran-community.slack.com/archives/C08HU35NPD4'} | ${'https://filigran-community.slack.com/archives/C08HU35NPD4'} | ${'the link chosen on the epic'}
    ${'https://filigran-community.slack.com/archives/CUSTOM12345'} | ${'https://filigran-community.slack.com/archives/CUSTOM12345'} | ${'a link typed by hand'}
    ${null}                                                        | ${DEFAULT_EPIC_SLACK_LINK}                                     | ${'the default link when the epic has none'}
    ${''}                                                          | ${DEFAULT_EPIC_SLACK_LINK}                                     | ${'the default link when the epic link is empty'}
    ${'javascript:alert(1)'}                                       | ${DEFAULT_EPIC_SLACK_LINK}                                     | ${'the default link when the epic link is not a Filigran slack link'}
    ${'https://evil.example.com/phishing'}                         | ${DEFAULT_EPIC_SLACK_LINK}                                     | ${'the default link when the epic link points to another domain'}
  `(
    'renders community call-to-action with $description',
    ({ slackLink, expectedLink }) => {
      // Given
      const environment = createMockEnvironment();

      // When
      testRender(
        <EpicItemDetailed
          {...defaultProps}
          epic={epic(slackLink)}
        />,
        {
          relayConfig: environment,
        }
      );

      // Then
      const communityLink = screen.getByRole('link', {
        name: 'Epic.JoinCommunity',
      });

      expect(communityLink).toHaveAttribute('href', expectedLink);
      expect(communityLink).toHaveAttribute('target', '_blank');
      expect(communityLink).toHaveAttribute('rel', 'noopener noreferrer');
    }
  );
});
