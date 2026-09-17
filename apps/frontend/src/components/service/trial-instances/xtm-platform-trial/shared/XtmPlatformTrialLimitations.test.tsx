import { XtmPlatformTrialLimitations } from '@/components/service/trial-instances/xtm-platform-trial/shared/XtmPlatformTrialLimitations';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('XtmPlatformTrialLimitations', () => {
  it('renders the limitations title, list and disclaimers', () => {
    render(<XtmPlatformTrialLimitations />);

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Limitations.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Limitations.Intro')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Limitations.OpenCTI')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Limitations.OpenAEV')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Limitations.Ingestion')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Limitations.NoSLA')
    ).toBeInTheDocument();
  });
});
