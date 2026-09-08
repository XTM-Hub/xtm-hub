import { isFeatureEnabled } from '@/utils/settings.service';
import Page from '@app/(application)/app/(user)/service/xtm-platform-trial/page';
import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/settings.service', () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/PrivateXtmPlatformTrialPanel',
  () => ({
    PrivateXtmPlatformTrialPanel: ({
      bundle,
    }: {
      bundle: { hub_status?: string } | null;
    }) => (
      <div data-testid="private-panel">{bundle?.hub_status ?? 'no-bundle'}</div>
    ),
  })
);

const mockUseXtmPlatformTrialPanelView = vi.fn();
vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/useXtmPlatformTrialPanelView',
  () => ({
    useXtmPlatformTrialPanelView: (
      ...args: Parameters<typeof mockUseXtmPlatformTrialPanelView>
    ) => mockUseXtmPlatformTrialPanelView(...args),
  })
);

vi.mock('@/components/xtm-platform-trial/XtmPlatformTrialPage', () => ({
  XtmPlatformTrialPage: () => <div data-testid="bundle-dashboard" />,
}));

const mockUseXtmPlatformBundleQuery = vi.fn();
vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useXtmPlatformBundleQuery: (
    ...args: Parameters<typeof mockUseXtmPlatformBundleQuery>
  ) => mockUseXtmPlatformBundleQuery(...args),
}));

vi.mock('@graphql/deployment/deployment.keys', () => ({
  xtmPlatformBundleKeys: {
    all: () => ['XtmPlatformBundle'],
  },
}));

describe('private xtm-platform-trial page', () => {
  beforeEach(() => {
    vi.mocked(isFeatureEnabled).mockReset();
    vi.mocked(notFound).mockClear();
    mockUseXtmPlatformBundleQuery.mockReset();
    mockUseXtmPlatformTrialPanelView.mockReset();
    mockUseXtmPlatformTrialPanelView.mockReturnValue({
      view: null,
      showLimitations: false,
      ongoingStandaloneTrials: [],
    });
  });

  it('renders the breadcrumb and the private panel with limitations shown when there is no active bundle', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: { xtmPlatformBundle: null },
      isLoading: false,
    });
    mockUseXtmPlatformTrialPanelView.mockReturnValue({
      view: { kind: 'form', hasOngoingStandaloneTrials: false },
      showLimitations: true,
      ongoingStandaloneTrials: [],
    });

    const element = await Page();
    render(element);

    expect(screen.getByTestId('private-panel')).toBeInTheDocument();
    expect(screen.getByTestId('private-panel')).toHaveTextContent('no-bundle');
    expect(screen.queryByTestId('bundle-dashboard')).not.toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Breadcrumb')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Limitations.Title')
    ).toBeInTheDocument();
  });

  it('renders the private panel with the bundle forwarded when the bundle is not active (e.g. queued/pending/provisioning/cancelled/expired)', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: {
        xtmPlatformBundle: {
          service_instance_id: 'bundle-instance-id',
          hub_status: 'pending',
        },
      },
      isLoading: false,
    });
    mockUseXtmPlatformTrialPanelView.mockReturnValue({
      view: {
        kind: 'status',
        state: 'request-in-progress',
        stepIndex: 0,
      },
      showLimitations: false,
      ongoingStandaloneTrials: [],
    });

    const element = await Page();
    render(element);

    expect(screen.getByTestId('private-panel')).toHaveTextContent('pending');
    expect(screen.queryByTestId('bundle-dashboard')).not.toBeInTheDocument();
  });

  it('renders the bundle dashboard instead of the private panel when an active bundle exists', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: {
        xtmPlatformBundle: {
          service_instance_id: 'bundle-instance-id',
          hub_status: 'active',
        },
      },
      isLoading: false,
    });

    const element = await Page();
    render(element);

    expect(screen.getByTestId('bundle-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('private-panel')).not.toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Breadcrumb')
    ).toBeInTheDocument();
  });

  it('renders nothing while the active bundle lookup is loading', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const element = await Page();
    render(element);

    expect(screen.queryByTestId('private-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bundle-dashboard')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Service.Trials.XtmPlatform.Page.Breadcrumb')
    ).not.toBeInTheDocument();
  });

  it('calls notFound when the XtmPlatformTrial feature flag is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    await Page();

    expect(notFound).toHaveBeenCalled();
  });
});
