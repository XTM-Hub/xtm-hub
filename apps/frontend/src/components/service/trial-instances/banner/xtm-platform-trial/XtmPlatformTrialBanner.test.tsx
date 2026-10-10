import { XtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/XtmPlatformTrialBanner';
import testRender from '@/utils/test/test-render';
import { SnackbarProvider, SnackbarViewport } from '@filigran/design-system';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const NO_TRIAL_TEXT = 'Service.Trials.XtmPlatform.NoTrial.Text';
const ACTIVE_TEXT = 'Service.Trials.XtmPlatform.Active.Text';
const ENDING_TEXT = 'Service.Trials.XtmPlatform.Ending.Text';
const DAYS_LEFT = 'Service.Trials.XtmPlatform.DaysLeft';
const LEARN_MORE = 'Service.Trials.LearnMore.Link';
const CLOSE_LABEL = 'Utils.Close';
const NO_TRIAL_DISMISSED_KEY = 'xtmPlatformTrialBannerDismissed_noTrial';
const ACTIVE_DISMISSED_KEY = 'xtmPlatformTrialBannerDismissed_active';

const renderBanner = (props: ComponentProps<typeof XtmPlatformTrialBanner>) =>
  testRender(
    <SnackbarProvider>
      <XtmPlatformTrialBanner {...props} />
      <SnackbarViewport />
    </SnackbarProvider>
  );

// The snackbar viewport is the only region, and each message is one of its
// list items.
const findSnackbar = async () =>
  within(await screen.findByRole('region')).findByRole('listitem');

describe('XtmPlatformTrialBanner', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.mocked(usePathname).mockReset();
  });

  it('should render nothing for the "none" state', async () => {
    const { container } = renderBanner({ state: 'none' });

    expect(container).toBeEmptyDOMElement();
    expect(
      within(await screen.findByRole('region')).queryByRole('listitem')
    ).toBeNull();
  });

  it('should render the no-trial copy, learn more link and a dismiss button in a snackbar', async () => {
    renderBanner({
      state: 'no-trial',
      learnMoreHref: '/app/service/xtm-platform-trial',
    });

    const snackbar = await findSnackbar();
    expect(snackbar).toHaveTextContent(NO_TRIAL_TEXT);
    expect(screen.getByRole('link', { name: LEARN_MORE })).toHaveAttribute(
      'href',
      '/app/service/xtm-platform-trial'
    );
    expect(
      screen.getByRole('button', { name: CLOSE_LABEL })
    ).toBeInTheDocument();
  });

  it.each`
    page           | pathname                                            | learnMoreHref
    ${'signed-in'} | ${'/app/service/xtm-platform-trial'}                | ${'https://hub.filigran.io/app/service/xtm-platform-trial'}
    ${'public'}    | ${'/en/cybersecurity-solutions/xtm-platform-trial'} | ${'/en/cybersecurity-solutions/xtm-platform-trial'}
  `(
    'should hide the learn more link when already on the $page trial page',
    async ({ pathname, learnMoreHref }) => {
      vi.mocked(usePathname).mockReturnValue(pathname);

      renderBanner({ state: 'no-trial', learnMoreHref });

      expect(await screen.findByText(NO_TRIAL_TEXT)).toBeInTheDocument();
      expect(screen.queryByText(LEARN_MORE)).toBeNull();
    }
  );

  it('should render the active copy, days-left badge and a dismiss button in a snackbar', async () => {
    renderBanner({ state: 'active', daysLeft: 12 });

    const snackbar = await findSnackbar();
    expect(snackbar).toHaveTextContent(ACTIVE_TEXT);
    expect(snackbar).toHaveTextContent(DAYS_LEFT);
    expect(
      screen.getByRole('button', { name: CLOSE_LABEL })
    ).toBeInTheDocument();
  });

  it('should render the ending copy and days-left badge as an in-page alert with no dismiss button', async () => {
    const { container } = renderBanner({ state: 'ending', daysLeft: 3 });

    expect(container).toHaveTextContent(ENDING_TEXT);
    expect(container).toHaveTextContent(DAYS_LEFT);
    expect(
      within(await screen.findByRole('region')).queryByRole('listitem')
    ).toBeNull();
    expect(screen.queryByRole('button', { name: CLOSE_LABEL })).toBeNull();
  });

  it('should store the dismissal for its state and hide once the close button is clicked', async () => {
    const { user } = renderBanner({ state: 'no-trial' });

    await user.click(await screen.findByRole('button', { name: CLOSE_LABEL }));

    expect(window.localStorage.getItem(NO_TRIAL_DISMISSED_KEY)).toBe('true');
    expect(window.localStorage.getItem(ACTIVE_DISMISSED_KEY)).toBeNull();
    await waitFor(() => {
      expect(screen.queryByText(NO_TRIAL_TEXT)).toBeNull();
    });
  });

  it('should store the dismissal for its state and hide once swiped away', async () => {
    renderBanner({ state: 'active', daysLeft: 12 });
    const snackbar = await findSnackbar();
    // jsdom implements no pointer capture, which the swipe relies on.
    snackbar.setPointerCapture = vi.fn();
    snackbar.hasPointerCapture = vi.fn(() => false);

    fireEvent.pointerDown(snackbar, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(snackbar, { clientX: 10, clientY: 0 });
    fireEvent.pointerMove(snackbar, { clientX: 200, clientY: 0 });
    fireEvent.pointerUp(snackbar, { clientX: 200, clientY: 0 });

    expect(window.localStorage.getItem(ACTIVE_DISMISSED_KEY)).toBe('true');
    expect(window.localStorage.getItem(NO_TRIAL_DISMISSED_KEY)).toBeNull();
    await waitFor(() => {
      expect(screen.queryByText(ACTIVE_TEXT)).toBeNull();
    });
  });

  it('should dismiss the invitation when its learn more link is followed', async () => {
    const { user } = renderBanner({
      state: 'no-trial',
      learnMoreHref: '/app/service/xtm-platform-trial',
    });

    await user.click(await screen.findByRole('link', { name: LEARN_MORE }));

    expect(window.localStorage.getItem(NO_TRIAL_DISMISSED_KEY)).toBe('true');
  });

  it('should stay hidden when its state was dismissed before', async () => {
    window.localStorage.setItem(NO_TRIAL_DISMISSED_KEY, 'true');

    renderBanner({ state: 'no-trial' });

    // The viewport mounts after a render: wait for it before asserting absence.
    await screen.findByRole('region');
    expect(screen.queryByText(NO_TRIAL_TEXT)).toBeNull();
  });
});
