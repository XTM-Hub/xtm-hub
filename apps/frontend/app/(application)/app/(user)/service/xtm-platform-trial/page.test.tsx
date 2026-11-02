import { XtmPlatformTrialStatusPanelState } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/xtm-platform-trial-panel.utils';
import Page, {
  generateMetadata,
} from '@app/(application)/app/(user)/service/xtm-platform-trial/page';
import { DeploymentRequestHubStatus } from '@graphql/generated';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/request-panel/PrivateXtmPlatformTrialPanel',
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

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

const mockUseXtmPlatformTrialPanelView = vi.fn();
vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/request-panel/useXtmPlatformTrialPanelView',
  () => ({
    useXtmPlatformTrialPanelView: (
      ...args: Parameters<typeof mockUseXtmPlatformTrialPanelView>
    ) => mockUseXtmPlatformTrialPanelView(...args),
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/active-bundle/XtmPlatformActiveBundlePage',
  () => ({
    XtmPlatformActiveBundlePage: () => <div data-testid="bundle-dashboard" />,
  })
);

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

const buildBundle = (hubStatus: DeploymentRequestHubStatus) => ({
  service_instance_id: 'bundle-instance-id',
  hub_status: hubStatus,
});

describe('private xtm-platform-trial page', () => {
  beforeEach(() => {
    mockUseXtmPlatformBundleQuery.mockReset();
    mockUseXtmPlatformTrialPanelView.mockReset();
    mockUseXtmPlatformTrialPanelView.mockReturnValue({ kind: 'form' });
  });

  it('renders the breadcrumb and the private panel with limitations shown when there is no active bundle', async () => {
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: { xtmPlatformBundle: null },
      isLoading: false,
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
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: {
        xtmPlatformBundle: buildBundle(DeploymentRequestHubStatus.Pending),
      },
      isLoading: false,
    });
    mockUseXtmPlatformTrialPanelView.mockReturnValue({
      kind: 'status',
      state: XtmPlatformTrialStatusPanelState.RequestInProgress,
      stepIndex: 0,
    });

    const element = await Page();
    render(element);

    expect(screen.getByTestId('private-panel')).toHaveTextContent(
      DeploymentRequestHubStatus.Pending
    );
    expect(screen.queryByTestId('bundle-dashboard')).not.toBeInTheDocument();
  });

  it('should hide the limitations when the panel view is a cancelled status', async () => {
    // Given
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: {
        xtmPlatformBundle: buildBundle(DeploymentRequestHubStatus.Cancelled),
      },
      isLoading: false,
    });
    mockUseXtmPlatformTrialPanelView.mockReturnValue({
      kind: 'status',
      state: XtmPlatformTrialStatusPanelState.Cancelled,
      stepIndex: undefined,
    });

    // When
    const element = await Page();
    render(element);

    // Then
    expect(
      screen.queryByText('Service.Trials.XtmPlatform.Page.Limitations.Title')
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      hubStatus: DeploymentRequestHubStatus.Expired,
      state: XtmPlatformTrialStatusPanelState.Expired,
      expectedTitle: 'Service.Trials.XtmPlatform.Page.ExpiredTitle',
    },
    {
      hubStatus: DeploymentRequestHubStatus.Cancelled,
      state: XtmPlatformTrialStatusPanelState.Cancelled,
      expectedTitle: 'Service.Trials.XtmPlatform.Page.Title',
    },
  ])(
    'should render the $expectedTitle heading when the bundle is $hubStatus',
    async ({ hubStatus, state, expectedTitle }) => {
      // Given
      mockUseXtmPlatformBundleQuery.mockReturnValue({
        data: { xtmPlatformBundle: buildBundle(hubStatus) },
        isLoading: false,
      });
      mockUseXtmPlatformTrialPanelView.mockReturnValue({
        kind: 'status',
        state,
        stepIndex: undefined,
      });

      // When
      const element = await Page();
      render(element);

      // Then
      expect(
        screen.getByRole('heading', { level: 1, name: expectedTitle })
      ).toBeInTheDocument();
    }
  );

  it('renders the bundle dashboard instead of the private panel when an active bundle exists', async () => {
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: {
        xtmPlatformBundle: buildBundle(DeploymentRequestHubStatus.Active),
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

  it('uses the same browser tab title as the public trial page', async () => {
    const metadata = await generateMetadata();

    expect(metadata.title).toBe(
      'Service.Trials.XtmPlatform.Page.Title | XTM Hub'
    );
  });
});
