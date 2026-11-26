import { TrialGuidePage } from '@/components/service/trial-guide/TrialGuidePage';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('TrialGuidePage', () => {
  it('renders the breadcrumb, header and Need support button', () => {
    testRender(<TrialGuidePage />);

    expect(
      screen.getByText('Service.TrialGuide.Breadcrumb.TrialGuide')
    ).toBeInTheDocument();
    expect(screen.getByText('Service.TrialGuide.Title')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Service.Trials.NeedSupport' })
    ).toBeInTheDocument();
  });

  it('renders OpenCTI resource cards and checklist by default', () => {
    testRender(<TrialGuidePage />);

    expect(
      screen.getByText(
        'Service.TrialGuide.Opencti.ResourceCards.Documentation.Title'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.TrialGuide.Opencti.ChecklistItems.ActivateFeeds.Title'
      )
    ).toBeInTheDocument();
  });

  it('switches to the OpenAEV tab content when selected', async () => {
    const { user } = testRender(<TrialGuidePage />);

    await user.click(screen.getByRole('tab', { name: /OpenAEV/i }));

    expect(
      screen.getByText(
        'Service.TrialGuide.Openaev.ResourceCards.Documentation.Title'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.TrialGuide.Openaev.ChecklistItems.InstallStarterPack.Title'
      )
    ).toBeInTheDocument();
  });

  it('switches to the XTM One tab content when selected', async () => {
    const { user } = testRender(<TrialGuidePage />);

    await user.click(screen.getByRole('tab', { name: /XTM One/i }));

    expect(
      screen.getByText(
        'Service.TrialGuide.Xtmone.ResourceCards.Documentation.Title'
      )
    ).toBeInTheDocument();
  });
});
