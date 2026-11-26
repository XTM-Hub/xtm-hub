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
const CLOSE = 'Utils.Close';
const TEXT_BY_STATE = { 'no-trial': NO_TRIAL_TEXT, active: ACTIVE_TEXT };

describe('XtmPlatformTrialBanner', () => {
  afterEach(() => {
    vi.mocked(usePathname).mockReset();
    window.localStorage.clear();
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

  it.each(['no-trial', 'active'] as const)(
    'should render a close button when the state is %s',
    (state) => {
      // Given
      testRender(
        <XtmPlatformTrialBanner
          state={state}
          daysLeft={DAYS_LEFT_COUNT}
        />
      );

      // Then
      expect(screen.getByRole('button', { name: CLOSE })).toBeInTheDocument();
    }
  );

  it('should render no close button in the last days of the trial', () => {
    // Given
    testRender(
      <XtmPlatformTrialBanner
        state="ending"
        daysLeft={DAYS_LEFT_COUNT}
      />
    );

    // Then
    expect(screen.queryByRole('button', { name: CLOSE })).toBeNull();
  });

  it.each(['no-trial', 'active'] as const)(
    'should stay hidden once closed when the state is %s',
    async (state) => {
      // Given
      const { user, unmount } = testRender(
        <XtmPlatformTrialBanner state={state} />
      );

      // When
      await user.click(screen.getByRole('button', { name: CLOSE }));
      unmount();
      testRender(<XtmPlatformTrialBanner state={state} />);

      // Then
      expect(screen.queryByText(TEXT_BY_STATE[state])).toBeNull();
    }
  );

  it('should show the last days banner even after the active one was closed', async () => {
    // Given
    const { user, unmount } = testRender(
      <XtmPlatformTrialBanner state="active" />
    );
    await user.click(screen.getByRole('button', { name: CLOSE }));
    unmount();

    // When
    testRender(<XtmPlatformTrialBanner state="ending" />);

    // Then
    expect(screen.getByText(ENDING_TEXT)).toBeInTheDocument();
  });

  it('should move the focus to the page content once closed', async () => {
    // Given
    const { user } = testRender(
      <>
        <XtmPlatformTrialBanner state="no-trial" />
        <main>content</main>
      </>
    );

    // When
    await user.click(screen.getByRole('button', { name: CLOSE }));

    // Then
    expect(screen.getByRole('main')).toHaveFocus();
  });

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
