import { TrialGuideResourceCardContent } from '@/components/service/trial-guide/TrialGuide.content';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TrialGuideResourceCard from './TrialGuideResourceCard';

const TestIcon = () => <svg data-testid="test-icon" />;

const buildResourceCard = (
  overrides?: Partial<TrialGuideResourceCardContent>
): TrialGuideResourceCardContent => ({
  id: 'documentation',
  Icon: TestIcon,
  titleKey: 'Service.TrialGuide.Opencti.ResourceCards.Documentation.Title',
  descriptionKey:
    'Service.TrialGuide.Opencti.ResourceCards.Documentation.Description',
  url: 'https://docs.opencti.io/',
  analyticsId: 'trial_guide_documentation_open',
  linkType: 'Documentation',
  ...overrides,
});

describe('TrialGuideResourceCard', () => {
  it('renders the title, description and a working See more link', () => {
    testRender(<TrialGuideResourceCard resourceCard={buildResourceCard()} />);

    expect(
      screen.getByText(
        'Service.TrialGuide.Opencti.ResourceCards.Documentation.Title'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.TrialGuide.Opencti.ResourceCards.Documentation.Description'
      )
    ).toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: /Service.TrialGuide.SeeMore/,
    });
    expect(link).toHaveAttribute('href', 'https://docs.opencti.io/');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not render the See more link when no url is provided', () => {
    testRender(
      <TrialGuideResourceCard resourceCard={buildResourceCard({ url: '' })} />
    );

    expect(
      screen.queryByRole('link', { name: /Service.TrialGuide.SeeMore/ })
    ).not.toBeInTheDocument();
  });
});
