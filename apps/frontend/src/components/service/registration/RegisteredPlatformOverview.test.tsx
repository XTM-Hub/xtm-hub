import { RegisteredPlatformOverview } from '@/components/service/registration/RegisteredPlatformOverview';
import { basePlatform } from '@/components/service/registration/registered-platform.fixtures';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import {
  CommercialModel,
  OrganizationCapability,
  PlatformIdentifier,
  PortalCapability,
  RegisteredPlatformDetailsFragment,
  SaasPlatformMetricsPeriod,
  SaasPlatformStorage,
  useRegisteredPlatformByServiceInstanceQuery,
  useRegisteredSaasPlatformDataQuery,
} from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { act, screen, within } from '@testing-library/react';
import {
  notFound,
  ReadonlyURLSearchParams,
  useSearchParams,
} from 'next/navigation';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useRegisteredPlatformByServiceInstanceQuery: vi.fn(),
    useRegisteredSaasPlatformDataQuery: vi.fn(),
    useUsersWithCapabilitiesInOrganizationQuery: vi.fn(() => ({
      data: undefined,
    })),
  });
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

const saasPlatform: RegisteredPlatformDetailsFragment = {
  ...basePlatform,
  commercial_model: CommercialModel.Saas,
};

const METRICS_VIEWER = {
  capabilities: [PortalCapability.ReadSaasMetrics],
  organizationCapabilities: [OrganizationCapability.ManagePlatformRegistration],
};

const renderOverview = async (
  platform: RegisteredPlatformDetailsFragment | null,
  {
    capabilities = [PortalCapability.ReadSaasMetrics],
    organizationCapabilities = [],
  }: {
    capabilities?: PortalCapability[];
    organizationCapabilities?: OrganizationCapability[];
  } = {}
) => {
  vi.mocked(useRegisteredPlatformByServiceInstanceQuery).mockReturnValue({
    data: { registeredPlatform: platform },
  } as ReturnType<typeof useRegisteredPlatformByServiceInstanceQuery>);
  let rendered: ReturnType<typeof testRender> | undefined;
  await act(async () => {
    rendered = testRender(
      <Suspense>
        <RegisteredPlatformOverview
          params={Promise.resolve({
            serviceInstanceId: encodeURIComponent(SERVICE_INSTANCE_ID),
          })}
          platformIdentifier={PlatformIdentifier.Opencti}
        />
      </Suspense>,
      {
        me: {
          capabilities: capabilities.map((name) => ({ name })),
          selected_org_capabilities: organizationCapabilities,
        },
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
    const variables = { input: { service_instance_id: SERVICE_INSTANCE_ID } };
    expect(useRegisteredPlatformByServiceInstanceQuery).toHaveBeenCalledWith(
      expect.anything(),
      variables,
      expect.objectContaining({
        queryKey: registrationKeys.byServiceInstance(variables),
      })
    );
  });

  it('should display a loader until the registered platform is loaded', async () => {
    // Given
    vi.mocked(useRegisteredPlatformByServiceInstanceQuery).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useRegisteredPlatformByServiceInstanceQuery>);

    // When
    await act(async () => {
      testRender(
        <Suspense>
          <RegisteredPlatformOverview
            params={Promise.resolve({ serviceInstanceId: SERVICE_INSTANCE_ID })}
            platformIdentifier={PlatformIdentifier.Opencti}
          />
        </Suspense>
      );
    });

    // Then
    expect(notFound).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'Register.Details.PlatformInformation',
      })
    ).not.toBeInTheDocument();
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
      await renderOverview(basePlatform, { capabilities });

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

  it.each`
    description                                             | capabilities                          | organizationCapabilities
    ${'BYPASS'}                                             | ${[PortalCapability.Bypass]}          | ${[]}
    ${'READ_SAAS_METRICS and ADMINISTRATE_ORGANIZATION'}    | ${[PortalCapability.ReadSaasMetrics]} | ${[OrganizationCapability.AdministrateOrganization]}
    ${'READ_SAAS_METRICS and MANAGE_PLATFORM_REGISTRATION'} | ${[PortalCapability.ReadSaasMetrics]} | ${[OrganizationCapability.ManagePlatformRegistration]}
  `(
    'should display the platform metrics of a SaaS platform when the user has $description',
    async ({ capabilities, organizationCapabilities }) => {
      // When
      await renderOverview(saasPlatform, {
        capabilities,
        organizationCapabilities,
      });

      // Then
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: 'Register.Metrics.Title',
        })
      ).toBeInTheDocument();
    }
  );

  it.each`
    description                                 | organizationCapabilities
    ${'no organization capability'}             | ${[]}
    ${'only MANAGE_ACCESS in its organization'} | ${[OrganizationCapability.ManageAccess]}
  `(
    'should display the SaaS subscription metadata and the platform metrics without the access request when a READ_SAAS_METRICS user has $description',
    async ({ organizationCapabilities }) => {
      // When
      await renderOverview(saasPlatform, {
        capabilities: [PortalCapability.ReadSaasMetrics],
        organizationCapabilities,
      });

      // Then
      expect(screen.getByText(HOSTNAME)).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: 'Register.Metrics.Title',
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Register.Metrics.AccessRequest.Title')
      ).not.toBeInTheDocument();
    }
  );

  it('should send the metrics view of the platform product when a SaaS platform shows its metrics', async () => {
    // Given
    startAnalytics();

    // When
    await renderOverview(saasPlatform, METRICS_VIEWER);

    // Then
    expect(readTrackedEvents('view_platform_metrics')).toEqual([
      { product: 'OpenCTI', period: 'Last 90 days' },
    ]);
  });

  it('should not display the access request when the platform is not a SaaS one', async () => {
    // When
    await renderOverview(basePlatform, {
      capabilities: [PortalCapability.ReadSaasMetrics],
    });

    // Then
    expect(
      screen.queryByText('Register.Metrics.AccessRequest.Title')
    ).not.toBeInTheDocument();
  });

  it.each([[CommercialModel.Other], [null]])(
    'should neither query nor display the SaaS subscription metadata when the commercial model is %s',
    async (commercialModel) => {
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

  it.each([
    [[]],
    [[PortalCapability.ReadTrials]],
    [[PortalCapability.Bypass]],
    [[PortalCapability.ReadSaasMetrics]],
  ])(
    'should query and display the SaaS platform data whatever the user capabilities, here %j',
    async (capabilities) => {
      // When
      await renderOverview(saasPlatform, { capabilities });

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
    'should display the access request instead of the platform metrics when the user has %j and no organization capability',
    async (capabilities) => {
      // When
      await renderOverview(saasPlatform, { capabilities });

      // Then
      expect(
        screen.getByText('Register.Metrics.AccessRequest.Title')
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', {
          level: 2,
          name: 'Register.Metrics.Title',
        })
      ).not.toBeInTheDocument();
    }
  );

  it('should display the SaaS subscription metadata as loading while the query is pending', async () => {
    // Given
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
    const { user } = await renderOverview(saasPlatform, METRICS_VIEWER);

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
    mockSaasPlatformDataQuery({ isPlaceholderData: true });

    // When
    const { container } = await renderOverview(saasPlatform, METRICS_VIEWER);

    // Then the metadata stays on screen and only the metrics are busy
    const metadataSection = screen
      .getByText('Register.Metrics.Metadata.Hostname:')
      .closest('section');
    expect(metadataSection).not.toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(HOSTNAME)).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
  });
});
