import { RegistrationMetadata } from '@/components/service/registration/RegistrationMetadata';
import { basePlatform } from '@/components/service/registration/registered-platform.fixtures';
import testRender from '@/utils/test/test-render';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  CommercialModel,
  RegisteredSaasPlatformMetadataQuery,
  useRegisteredSaasPlatformMetadataQuery,
} from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { showSnackbarMock } = vi.hoisted(() => ({ showSnackbarMock: vi.fn() }));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

let mockPlatformData: registeredPlatformByServiceInstanceId_fragment$data;

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useFragment: () => mockPlatformData,
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  const useRegisteredSaasPlatformMetadataQuery = Object.assign(vi.fn(), {
    getKey: actual.useRegisteredSaasPlatformMetadataQuery.getKey,
  });
  return { ...actual, useRegisteredSaasPlatformMetadataQuery };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const HOSTNAME = 'my-platform.filigran.io';
const PLAN = 'Enterprise';
const REGION = 'eu-west';
const START_DATE = '2026-01-01T12:00:00.000Z';
const END_DATE = '2026-01-11T12:00:00.000Z';
const NOW = '2026-01-04T12:00:00.000Z';
const FORMATTED_CONTRACT = '1/1/2026 → 1/11/2026';
const DAYS_LEFT = 7;
const ELAPSED_PERCENT = 30;

const saasPlatform: registeredPlatformByServiceInstanceId_fragment$data = {
  ...basePlatform,
  commercial_model: CommercialModel.Saas,
};

type Metadata = NonNullable<
  RegisteredSaasPlatformMetadataQuery['registeredSaasPlatformMetadata']
>;

const fullMetadata: Metadata = {
  hostname: HOSTNAME,
  plan: PLAN,
  start_date: START_DATE,
  end_date: END_DATE,
  region: REGION,
};

const emptyMetadata: Metadata = {
  hostname: null,
  plan: null,
  start_date: null,
  end_date: null,
  region: null,
};

const mockMetadataQuery = ({
  metadata = fullMetadata,
  isPending = false,
}: {
  metadata?: Metadata | null;
  isPending?: boolean;
} = {}) =>
  vi.mocked(useRegisteredSaasPlatformMetadataQuery).mockReturnValue({
    data: isPending ? undefined : { registeredSaasPlatformMetadata: metadata },
    isPending,
  } as ReturnType<typeof useRegisteredSaasPlatformMetadataQuery>);

const renderMetadata = (
  platform: registeredPlatformByServiceInstanceId_fragment$data = saasPlatform
) => {
  mockPlatformData = platform;
  return testRender(<RegistrationMetadata registeredPlatform={platform} />);
};

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
    mockMetadataQuery();
    showSnackbarMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('when the platform is not a SaaS one', () => {
    it.each([[CommercialModel.Other], [null]])(
      'should render nothing when the commercial model is %s',
      (commercialModel) => {
        // Given / When
        const { container } = renderMetadata({
          ...saasPlatform,
          commercial_model: commercialModel,
        });

        // Then
        expect(container).toBeEmptyDOMElement();
      }
    );

    it('should not query the SaaS Manager metadata', () => {
      // Given / When
      renderMetadata({
        ...saasPlatform,
        commercial_model: CommercialModel.Other,
      });

      // Then
      expect(useRegisteredSaasPlatformMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        { input: { service_instance_id: saasPlatform.service_instance_id } },
        expect.objectContaining({ enabled: false })
      );
    });
  });

  describe('when the platform is a SaaS one', () => {
    it('should query the SaaS Manager metadata of the platform', () => {
      // Given / When
      renderMetadata();

      // Then
      expect(useRegisteredSaasPlatformMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        { input: { service_instance_id: saasPlatform.service_instance_id } },
        expect.objectContaining({ enabled: true })
      );
    });

    it.each`
      labelKey
      ${'Register.Metrics.Metadata.Hostname'}
      ${'Register.Metrics.Metadata.SubscribedPlan'}
      ${'Register.Metrics.Metadata.Contract'}
      ${'Register.Metrics.Metadata.RegionalArea'}
    `(
      'should keep the $labelKey row in place while the metadata is loading',
      ({ labelKey }) => {
        // Given
        mockMetadataQuery({ isPending: true });

        // When
        renderMetadata();

        // Then
        expect(getRow(labelKey).closest('section')).toHaveAttribute(
          'aria-busy',
          'true'
        );
      }
    );

    it('should not display any value while the metadata is loading', () => {
      // Given
      mockMetadataQuery({ isPending: true });

      // When
      renderMetadata();

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
      // Given
      mockMetadataQuery({ metadata: { ...fullMetadata, hostname: null } });

      // When
      renderMetadata();

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
        // Given
        mockMetadataQuery({ metadata: emptyMetadata });

        // When
        renderMetadata();

        // Then
        expect(
          within(getRow(labelKey)).getByText(
            'Register.Metrics.Metadata.Unavailable'
          )
        ).toBeInTheDocument();
      }
    );

    it('should display the unavailable message in every row when the SaaS Manager returns no metadata', () => {
      // Given
      mockMetadataQuery({ metadata: null });

      // When
      renderMetadata();

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
        // Given
        mockMetadataQuery({ metadata });

        // When
        renderMetadata();

        // Then
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      }
    );
  });
});
