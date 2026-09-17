import { XtmPlatformTrialPitch } from '@/components/service/trial-instances/xtm-platform-trial/request-pitch/XtmPlatformTrialPitch';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('XtmPlatformTrialPitch', () => {
  it('renders the pitch title and description', () => {
    render(<XtmPlatformTrialPitch />);

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.PitchTitle')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.PitchDescription')
    ).toBeInTheDocument();
  });

  it('renders the name of each bundled product', () => {
    render(<XtmPlatformTrialPitch />);

    expect(screen.getByText('OpenCTI')).toBeInTheDocument();
    expect(screen.getByText('OpenAEV')).toBeInTheDocument();
    expect(screen.getByText('XTM One')).toBeInTheDocument();
  });

  it('renders the tagline and description translation keys for each product', () => {
    render(<XtmPlatformTrialPitch />);

    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Products.opencti.Tagline'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Products.openaev.Tagline'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Products.xtmone.Tagline'
      )
    ).toBeInTheDocument();
  });
});
