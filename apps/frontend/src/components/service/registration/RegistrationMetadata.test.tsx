import { RegistrationMetadata } from '@/components/service/registration/RegistrationMetadata';
import testRender from '@/utils/test/test-render';
import { SaasPlatformMetadata } from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { showSnackbarMock } = vi.hoisted(() => ({ showSnackbarMock: vi.fn() }));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const HOSTNAME = 'my-platform.filigran.io';
const PLAN = 'Enterprise';
const REGION = 'eu-west';
const START_DATE = '2026-01-01T12:00:00.000Z';
const END_DATE = '2026-01-11T12:00:00.000Z';
const NOW = '2026-01-04T12:00:00.000Z';
const FORMATTED_CONTRACT = 'Jan 1, 2026 → Jan 11, 2026';
const DAYS_LEFT = 7;
const ELAPSED_PERCENT = 30;

const fullMetadata: SaasPlatformMetadata = {
  hostname: HOSTNAME,
  plan: PLAN,
  start_date: START_DATE,
  end_date: END_DATE,
  region: REGION,
};

const emptyMetadata: SaasPlatformMetadata = {
  hostname: null,
  plan: null,
  start_date: null,
  end_date: null,
  region: null,
};

const renderMetadata = ({
  metadata = fullMetadata,
  isLoading = false,
}: {
  metadata?: SaasPlatformMetadata | null;
  isLoading?: boolean;
} = {}) =>
  testRender(
    <RegistrationMetadata
      metadata={metadata}
      isLoading={isLoading}
    />
  );

const COPY_HOSTNAME_LABEL = 'Register.Metrics.Metadata.CopyHostname';

const getRow = (labelKey: string) =>
  screen.getByText(`${labelKey}:`).closest('li') as HTMLElement;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegistrationMetadata', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(NOW) });
    vi.mocked(useTranslations).mockReturnValue(((
      key: string,
      values?: Record<string, unknown>
    ) => (values ? `${key}:${JSON.stringify(values)}` : key)) as ReturnType<
      typeof useTranslations
    >);
    showSnackbarMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('metadata display', () => {
    it.each`
      labelKey
      ${'Register.Metrics.Metadata.Hostname'}
      ${'Register.Metrics.Metadata.SubscribedPlan'}
      ${'Register.Metrics.Metadata.Contract'}
      ${'Register.Metrics.Metadata.RegionalArea'}
    `(
      'should keep the $labelKey row in place while the metadata is loading',
      ({ labelKey }) => {
        // Given / When
        renderMetadata({ isLoading: true });

        // Then
        expect(getRow(labelKey).closest('section')).toHaveAttribute(
          'aria-busy',
          'true'
        );
      }
    );

    it('should not display any value while the metadata is loading', () => {
      // Given / When
      renderMetadata({ isLoading: true });

      // Then
      expect(
        screen.queryByText('Register.Metrics.Metadata.Unavailable')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: COPY_HOSTNAME_LABEL })
      ).not.toBeInTheDocument();
    });

    it.each`
      labelKey                                      | value
      ${'Register.Metrics.Metadata.Hostname'}       | ${HOSTNAME}
      ${'Register.Metrics.Metadata.SubscribedPlan'} | ${PLAN}
      ${'Register.Metrics.Metadata.Contract'}       | ${FORMATTED_CONTRACT}
      ${'Register.Metrics.Metadata.RegionalArea'}   | ${REGION}
    `('should display $value in the $labelKey row', ({ labelKey, value }) => {
      // Given / When
      renderMetadata();

      // Then
      expect(within(getRow(labelKey)).getByText(value)).toBeInTheDocument();
    });

    it('should copy the hostname to the clipboard when clicking the copy button', async () => {
      // Given
      const { user } = renderMetadata();
      // userEvent.setup() installs its own clipboard stub, so read it after render
      const writeText = vi.spyOn(navigator.clipboard, 'writeText');

      // When
      await user.click(
        screen.getByRole('button', { name: COPY_HOSTNAME_LABEL })
      );

      // Then
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(HOSTNAME));
    });

    it.each`
      outcome        | writeText                                    | expectedSnackbar
      ${'succeeds'}  | ${() => Promise.resolve()}                   | ${{ severity: 'success', title: 'Utils.Copied' }}
      ${'is denied'} | ${() => Promise.reject(new Error('denied'))} | ${{ severity: 'error', title: 'Utils.FailedToCopy' }}
    `(
      'should tell the user the result when the copy $outcome',
      async ({ writeText, expectedSnackbar }) => {
        // Given
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { user } = renderMetadata();
        vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(
          writeText
        );

        // When
        await user.click(
          screen.getByRole('button', { name: COPY_HOSTNAME_LABEL })
        );

        // Then
        await waitFor(() =>
          expect(showSnackbarMock).toHaveBeenCalledWith(expectedSnackbar)
        );
      }
    );

    it('should not offer to copy the hostname when it is unavailable', () => {
      // Given / When
      renderMetadata({ metadata: { ...fullMetadata, hostname: null } });

      // Then
      expect(
        screen.queryByRole('button', { name: COPY_HOSTNAME_LABEL })
      ).not.toBeInTheDocument();
    });

    it('should show how much of the contract has elapsed', () => {
      // Given / When
      renderMetadata();

      // Then
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        String(ELAPSED_PERCENT)
      );
    });

    it('should show how many days are left on the contract', () => {
      // Given / When
      renderMetadata();

      // Then
      expect(
        screen.getByText(
          `Register.Metrics.Metadata.DaysLeft:${JSON.stringify({ days: DAYS_LEFT })}`
        )
      ).toBeInTheDocument();
    });

    it.each`
      labelKey
      ${'Register.Metrics.Metadata.Hostname'}
      ${'Register.Metrics.Metadata.SubscribedPlan'}
      ${'Register.Metrics.Metadata.Contract'}
      ${'Register.Metrics.Metadata.RegionalArea'}
    `(
      'should display the unavailable message in the $labelKey row when the field is missing',
      ({ labelKey }) => {
        // Given / When
        renderMetadata({ metadata: emptyMetadata });

        // Then
        expect(
          within(getRow(labelKey)).getByText(
            'Register.Metrics.Metadata.Unavailable'
          )
        ).toBeInTheDocument();
      }
    );

    it('should display the unavailable message in every row when the SaaS Manager returns no metadata', () => {
      // Given / When
      renderMetadata({ metadata: null });

      // Then
      expect(
        screen.getAllByText('Register.Metrics.Metadata.Unavailable')
      ).toHaveLength(4);
    });

    it.each`
      description             | metadata
      ${'start date missing'} | ${{ ...fullMetadata, start_date: null }}
      ${'end date missing'}   | ${{ ...fullMetadata, end_date: null }}
      ${'both dates missing'} | ${{ ...fullMetadata, start_date: null, end_date: null }}
    `(
      'should not show the contract progress when $description',
      ({ metadata }) => {
        // Given / When
        renderMetadata({ metadata });

        // Then
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      }
    );
  });
});
