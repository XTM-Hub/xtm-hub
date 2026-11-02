import { RegisteredPlatformOverview } from '@/components/service/registration/RegisteredPlatformOverview';
import { basePlatform } from '@/components/service/registration/registered-platform.fixtures';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import testRender from '@/utils/test/test-render';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  CommercialModel,
  PortalCapability,
  SaasPlatformMetricsPeriod,
  SaasPlatformStorage,
  useRegisteredSaasPlatformDataQuery,
} from '@graphql/generated';
import { act, screen, within } from '@testing-library/react';
import {
  notFound,
  ReadonlyURLSearchParams,
  useSearchParams,
} from 'next/navigation';
import { Suspense } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

let mockPlatformData: registeredPlatformByServiceInstanceId_fragment$data | null;

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useLazyLoadQuery: vi.fn(() => ({ registeredPlatform: mockPlatformData })),
  useFragment: () => mockPlatformData,
  useMutation: () => [vi.fn(), false],
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  const useRegisteredSaasPlatformDataQuery = Object.assign(vi.fn(), {
    getKey: actual.useRegisteredSaasPlatformDataQuery.getKey,
  });
  return { ...actual, useRegisteredSaasPlatformDataQuery };
});

const HOSTNAME = 'my-platform.filigran.io';

const mockSaasPlatformDataQuery = ({
  isPending = false,
  isPlaceholderData = false,
  storage = null,
}: {
  isPending?: boolean;
  isPlaceholderData?: boolean;
  storage?: SaasPlatformStorage | null;
} = {}) =>
  vi.mocked(useRegisteredSaasPlatformDataQuery).mockReturnValue({
    data: isPending
      ? undefined
      : {
          registeredSaasPlatformData: {
            metadata: {
              hostname: HOSTNAME,
              plan: null,
              start_date: null,
              end_date: null,
              region: null,
            },
            storage,
          },
        },
    isPending,
    isPlaceholderData,
  } as ReturnType<typeof useRegisteredSaasPlatformDataQuery>);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SERVICE_INSTANCE_ID = 'service instance/id';
const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';

const saasPlatform: registeredPlatformByServiceInstanceId_fragment$data = {
  ...basePlatform,
  commercial_model: CommercialModel.Saas,
};

const renderOverview = async (
  platform: registeredPlatformByServiceInstanceId_fragment$data | null,
  capabilities: PortalCapability[] = [PortalCapability.ReadSaasMetrics]
) => {
  mockPlatformData = platform;
  let rendered: ReturnType<typeof testRender> | undefined;
  await act(async () => {
    rendered = testRender(
      <Suspense>
        <RegisteredPlatformOverview
          params={Promise.resolve({
            serviceInstanceId: encodeURIComponent(SERVICE_INSTANCE_ID),
          })}
        />
      </Suspense>,
      {
        me: { capabilities: capabilities.map((name) => ({ name })) },
      }
    );
  });
  return rendered!;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisteredPlatformOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaasPlatformDataQuery();
  });

  it('should load the registered platform of the decoded service instance id', async () => {
    // Given / When
    await renderOverview(basePlatform);

    // Then
    expect(useLazyLoadQuery).toHaveBeenCalledWith(expect.anything(), {
      input: { service_instance_id: SERVICE_INSTANCE_ID },
    });
  });

  it('should redirect to the not found page when the platform is not visible to the user', async () => {
    // Given
    vi.mocked(notFound).mockImplementationOnce(() => {
      throw new Error(NOT_FOUND_ERROR);
    });
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    // When
    await renderOverview(null).catch(() => undefined);

    // Then
    expect(notFound).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should display the platform title in the breadcrumb', async () => {
    // Given / When
    await renderOverview(basePlatform);

    // Then
    const breadcrumb = screen
      .getByRole('link', { name: 'MenuLinks.Home' })
      .closest('nav') as HTMLElement;
    expect(
      within(breadcrumb).getByText(basePlatform.title)
    ).toBeInTheDocument();
  });

  it.each`
    description                                               | capabilities                          | search              | breadcrumbLink
    ${'a user who can read saas metrics, from the CSM board'} | ${[PortalCapability.ReadSaasMetrics]} | ${'from=csm-board'} | ${'MenuLinks.CSMBoard'}
    ${'a user who can read saas metrics, from elsewhere'}     | ${[PortalCapability.ReadSaasMetrics]} | ${''}               | ${'MenuLinks.Home'}
    ${'a customer given a link from the CSM board'}           | ${[]}                                 | ${'from=csm-board'} | ${'MenuLinks.Home'}
  `(
    'should lead the breadcrumb back to $breadcrumbLink for $description',
    async ({ capabilities, search, breadcrumbLink }) => {
      // Given a platform page opened with a known origin
      vi.mocked(useSearchParams).mockReturnValue(
        new URLSearchParams(search) as ReadonlyURLSearchParams
      );

      // When the page is rendered
      await renderOverview(basePlatform, capabilities);

      // Then its breadcrumb leads back to where the user came from
      const breadcrumb = screen
        .getByRole('link', { name: breadcrumbLink })
        .closest('nav') as HTMLElement;
      expect(
        within(breadcrumb).getByText(basePlatform.title)
      ).toBeInTheDocument();
    }
  );

  it('should display the platform header and its information', async () => {
    // Given / When
    await renderOverview(basePlatform);

    // Then
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Register.Details.PlatformInformation',
      })
    ).toBeInTheDocument();
  });

  it('should query and display the SaaS subscription metadata of a SaaS platform with its service instance id', async () => {
    // Given
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);

    // When
    await renderOverview(saasPlatform);

    // Then
    expect(useRegisteredSaasPlatformDataQuery).toHaveBeenLastCalledWith(
      expect.anything(),
      {
        input: {
          service_instance_id: SERVICE_INSTANCE_ID,
          metrics_period: SaasPlatformMetricsPeriod.Last_90Days,
        },
      },
      expect.objectContaining({ enabled: true })
    );
    expect(screen.getByText(HOSTNAME)).toBeInTheDocument();
  });

  it('should display the platform metrics of a SaaS platform', async () => {
    // Given
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);

    // When
    await renderOverview(saasPlatform);

    // Then
    expect(
      screen.getByRole('heading', { level: 2, name: 'Register.Metrics.Title' })
    ).toBeInTheDocument();
  });

  it('should not display the platform metrics when the SaaS platform data is hidden', async () => {
    // Given SAAS_METRICS is disabled
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);

    // When
    await renderOverview(saasPlatform);

    // Then
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'Register.Metrics.Title',
      })
    ).not.toBeInTheDocument();
  });

  it('should neither query nor display the SaaS subscription metadata when SAAS_METRICS is disabled', async () => {
    // Given SAAS_METRICS is disabled
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);

    // When
    await renderOverview(saasPlatform);

    // Then
    expect(useRegisteredSaasPlatformDataQuery).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
    expect(
      screen.queryByText('Register.Metrics.Metadata.Hostname:')
    ).not.toBeInTheDocument();
  });

  it.each([[CommercialModel.Other], [null]])(
    'should neither query nor display the SaaS subscription metadata when the commercial model is %s',
    async (commercialModel) => {
      // Given
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);

      // When
      await renderOverview({
        ...basePlatform,
        commercial_model: commercialModel,
      });

      // Then
      expect(useRegisteredSaasPlatformDataQuery).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ enabled: false })
      );
      expect(
        screen.queryByText('Register.Metrics.Metadata.Hostname:')
      ).not.toBeInTheDocument();
    }
  );

  it.each([[PortalCapability.Bypass], [PortalCapability.ReadSaasMetrics]])(
    'should query and display the SaaS subscription metadata when the user has %s',
    async (capability) => {
      // Given
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);

      // When
      await renderOverview(saasPlatform, [capability]);

      // Then
      expect(useRegisteredSaasPlatformDataQuery).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ enabled: true })
      );
      expect(screen.getByText(HOSTNAME)).toBeInTheDocument();
    }
  );

  it.each([[[]], [[PortalCapability.ReadTrials]]])(
    'should neither query nor display the SaaS subscription metadata when the user capabilities are %j',
    async (capabilities) => {
      // Given
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);

      // When
      await renderOverview(saasPlatform, capabilities);

      // Then
      expect(useRegisteredSaasPlatformDataQuery).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ enabled: false })
      );
      expect(
        screen.queryByText('Register.Metrics.Metadata.Hostname:')
      ).not.toBeInTheDocument();
      expect(screen.getByText(basePlatform.url)).toBeInTheDocument();
    }
  );

  it('should display the SaaS subscription metadata as loading while the query is pending', async () => {
    // Given
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
    mockSaasPlatformDataQuery({ isPending: true });

    // When
    await renderOverview(saasPlatform);

    // Then
    expect(
      screen.getByText('Register.Metrics.Metadata.Hostname:').closest('section')
    ).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(HOSTNAME)).not.toBeInTheDocument();
  });

  it('should query the metrics of the period chosen in the period selector', async () => {
    // Given
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
    // The period selector is disabled while the metrics are unavailable.
    mockSaasPlatformDataQuery({
      storage: {
        es_used_size: {
          percent: 50,
          used: 1_500_000_000,
          limit: 3_000_000_000,
          time: '2026-10-22T12:00:00.000Z',
        },
      },
    });
    const { user } = await renderOverview(saasPlatform);

    // When
    await user.click(
      screen.getByRole('radio', {
        name: `Register.Metrics.Period.${SaasPlatformMetricsPeriod.Last_30Days}`,
      })
    );

    // Then
    expect(useRegisteredSaasPlatformDataQuery).toHaveBeenLastCalledWith(
      expect.anything(),
      {
        input: {
          service_instance_id: SERVICE_INSTANCE_ID,
          metrics_period: SaasPlatformMetricsPeriod.Last_30Days,
        },
      },
      expect.objectContaining({ enabled: true })
    );
  });

  it('should keep the SaaS subscription metadata and display the metrics as loading while another period loads', async () => {
    // Given
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
    mockSaasPlatformDataQuery({ isPlaceholderData: true });

    // When
    const { container } = await renderOverview(saasPlatform);

    // Then the metadata stays on screen and only the metrics are busy
    const metadataSection = screen
      .getByText('Register.Metrics.Metadata.Hostname:')
      .closest('section');
    expect(metadataSection).not.toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(HOSTNAME)).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
  });
});
