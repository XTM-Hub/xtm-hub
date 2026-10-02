import { XtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/XtmPlatformTrialBanner';
import testRender from '@/utils/test/test-render';
import { afterEach, describe, expect, it } from 'vitest';

describe('XtmPlatformTrialBanner', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('should render nothing for the "none" state', () => {
    const { container } = testRender(<XtmPlatformTrialBanner state="none" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render the no-trial copy, learn more link and a dismiss button', () => {
    const { getByText, getByRole } = testRender(
      <XtmPlatformTrialBanner
        state="no-trial"
        learnMoreHref="/app/service/xtm-platform-trial"
      />
    );

    expect(
      getByText('Service.Trials.XtmPlatform.NoTrial.Text')
    ).toBeInTheDocument();
    expect(getByText('Service.Trials.LearnMore.Link')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Utils.Close' })).toBeInTheDocument();
  });

  it('should render the active copy, days-left badge and a dismiss button', () => {
    const { getByText, getByRole } = testRender(
      <XtmPlatformTrialBanner
        state="active"
        daysLeft={12}
      />
    );

    expect(
      getByText('Service.Trials.XtmPlatform.Active.Text')
    ).toBeInTheDocument();
    expect(
      getByText('Service.Trials.XtmPlatform.DaysLeft')
    ).toBeInTheDocument();
    expect(getByRole('button', { name: 'Utils.Close' })).toBeInTheDocument();
  });

  it('should render the ending copy, days-left badge and no dismiss button', () => {
    const { getByText, queryByRole } = testRender(
      <XtmPlatformTrialBanner
        state="ending"
        daysLeft={3}
      />
    );

    expect(
      getByText('Service.Trials.XtmPlatform.Ending.Text')
    ).toBeInTheDocument();
    expect(
      getByText('Service.Trials.XtmPlatform.DaysLeft')
    ).toBeInTheDocument();
    expect(queryByRole('button', { name: 'Utils.Close' })).toBeNull();
  });

  it('should render nothing once dismissed', async () => {
    const { getByRole, container, user } = testRender(
      <XtmPlatformTrialBanner state="no-trial" />
    );

    await user.click(getByRole('button', { name: 'Utils.Close' }));

    expect(container).toBeEmptyDOMElement();
  });
});
