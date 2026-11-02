import { XtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/XtmPlatformTrialBanner';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

const NO_TRIAL_TEXT = 'Service.Trials.XtmPlatform.NoTrial.Text';
const ACTIVE_TEXT = 'Service.Trials.XtmPlatform.Active.Text';
const ENDING_TEXT = 'Service.Trials.XtmPlatform.Ending.Text';
const DAYS_LEFT = 'Service.Trials.XtmPlatform.DaysLeft';
const LEARN_MORE = 'Service.Trials.LearnMore.Link';
const LEARN_MORE_HREF = '/app/service/xtm-platform-trial';
const DAYS_LEFT_COUNT = 12;

describe('XtmPlatformTrialBanner', () => {
  afterEach(() => {
    vi.mocked(usePathname).mockReset();
  });

  it('should render nothing when the state is none', () => {
    // Given
    const { container } = testRender(<XtmPlatformTrialBanner state="none" />);

    // Then
    expect(container).toBeEmptyDOMElement();
  });

  it.each`
    state         | text             | variant
    ${'no-trial'} | ${NO_TRIAL_TEXT} | ${'default'}
    ${'active'}   | ${ACTIVE_TEXT}   | ${'default'}
    ${'ending'}   | ${ENDING_TEXT}   | ${'warning'}
  `(
    'should render the $state copy in the $variant banner when the state is $state',
    ({ state, text, variant }) => {
      // Given
      testRender(<XtmPlatformTrialBanner state={state} />);

      // Then
      expect(screen.getByText(text).closest('[data-variant]')).toHaveAttribute(
        'data-variant',
        variant
      );
    }
  );

  it.each(['no-trial', 'active', 'ending'] as const)(
    'should render no close button when the state is %s',
    (state) => {
      // Given
      testRender(
        <XtmPlatformTrialBanner
          state={state}
          daysLeft={DAYS_LEFT_COUNT}
          learnMoreHref={LEARN_MORE_HREF}
        />
      );

      // Then
      expect(screen.queryByRole('button')).toBeNull();
    }
  );

  it('should render the learn more link to the trial page when there is no trial', () => {
    // Given
    testRender(
      <XtmPlatformTrialBanner
        state="no-trial"
        learnMoreHref={LEARN_MORE_HREF}
      />
    );

    // Then
    expect(screen.getByRole('link', { name: LEARN_MORE })).toHaveAttribute(
      'href',
      LEARN_MORE_HREF
    );
  });

  it.each`
    page           | pathname                                            | learnMoreHref
    ${'signed-in'} | ${'/app/service/xtm-platform-trial'}                | ${'https://hub.filigran.io/app/service/xtm-platform-trial'}
    ${'public'}    | ${'/en/cybersecurity-solutions/xtm-platform-trial'} | ${'/en/cybersecurity-solutions/xtm-platform-trial'}
  `(
    'should hide the learn more link when already on the $page trial page',
    ({ pathname, learnMoreHref }) => {
      // Given
      vi.mocked(usePathname).mockReturnValue(pathname);

      // When
      testRender(
        <XtmPlatformTrialBanner
          state="no-trial"
          learnMoreHref={learnMoreHref}
        />
      );

      // Then
      expect(screen.queryByRole('link', { name: LEARN_MORE })).toBeNull();
    }
  );

  it.each(['active', 'ending'] as const)(
    'should render the days left when the state is %s',
    (state) => {
      // Given
      testRender(
        <XtmPlatformTrialBanner
          state={state}
          daysLeft={DAYS_LEFT_COUNT}
        />
      );

      // Then
      expect(screen.getByText(DAYS_LEFT)).toBeInTheDocument();
    }
  );

  it('should render no learn more link when there is no trial and no link to follow', () => {
    // Given
    testRender(<XtmPlatformTrialBanner state="no-trial" />);

    // Then
    expect(screen.queryByRole('link', { name: LEARN_MORE })).toBeNull();
  });

  it.each(['active', 'ending'] as const)(
    'should render no learn more link when the state is %s',
    (state) => {
      // Given
      testRender(
        <XtmPlatformTrialBanner
          state={state}
          daysLeft={DAYS_LEFT_COUNT}
          learnMoreHref={LEARN_MORE_HREF}
        />
      );

      // Then
      expect(screen.queryByRole('link', { name: LEARN_MORE })).toBeNull();
    }
  );

  it.each`
    state         | daysLeft
    ${'no-trial'} | ${DAYS_LEFT_COUNT}
    ${'active'}   | ${null}
    ${'ending'}   | ${null}
  `(
    'should render no days left when the state is $state and the days left are $daysLeft',
    ({ state, daysLeft }) => {
      // Given
      testRender(
        <XtmPlatformTrialBanner
          state={state}
          daysLeft={daysLeft}
        />
      );

      // Then
      expect(screen.queryByText(DAYS_LEFT)).toBeNull();
    }
  );
});
