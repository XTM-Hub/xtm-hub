import { PrivateXtmPlatformTrialPanel } from '@/components/service/trial-instances/xtm-platform-trial/PrivateXtmPlatformTrialPanel';
import {
  XtmPlatformTrialPanelView,
  XtmPlatformTrialStatusPanelState,
} from '@/components/service/trial-instances/xtm-platform-trial/xtm-platform-trial-panel.utils';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestSource,
  DeploymentRequestUseCase,
  PlatformIdentifier,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlMocks = vi.hoisted(() => ({
  useCreateDeploymentRequestMutation: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();

  return {
    ...actual,
    useCreateDeploymentRequestMutation:
      graphqlMocks.useCreateDeploymentRequestMutation,
  };
});

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

let capturedHandleSubmit:
  | ((values: {
      region: string;
      job_title: string;
      activity_sector: string;
      acceptTerms: boolean;
      use_cases_by_product: {
        platform_identifier: PlatformIdentifier;
        use_case?: DeploymentRequestUseCase;
      }[];
    }) => void)
  | undefined;

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialForm',
  () => ({
    XtmPlatformTrialForm: ({
      handleSubmit,
      hasOngoingStandaloneTrials,
    }: {
      handleSubmit: typeof capturedHandleSubmit;
      hasOngoingStandaloneTrials?: boolean;
    }) => {
      capturedHandleSubmit = handleSubmit;
      return (
        <div data-testid="xtm-platform-trial-form">
          {hasOngoingStandaloneTrials ? 'has-ongoing' : 'no-ongoing'}
        </div>
      );
    },
    xtmPlatformTrialFormSchema: {},
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialStatusPanel',
  () => ({
    XtmPlatformTrialStatusPanel: ({
      state,
      dateRows,
      products,
      stepIndex,
      actions,
    }: {
      state: string;
      dateRows: { labelKey: string; date: string | null }[];
      products: PlatformIdentifier[];
      stepIndex?: number;
      actions?: ReactNode;
    }) => (
      <div data-testid="xtm-platform-trial-status-panel">
        <span data-testid="panel-state">{state}</span>
        <span data-testid="panel-step-index">{stepIndex}</span>
        <span data-testid="panel-date-rows">{JSON.stringify(dateRows)}</span>
        <span data-testid="panel-products">{JSON.stringify(products)}</span>
        <div data-testid="panel-actions">{actions}</div>
      </div>
    ),
  })
);

vi.mock('@/components/xtm-platform-trial/BundleCancelSheet', () => ({
  BundleCancelSheet: ({ open }: { open: boolean }) => (
    <div data-testid="bundle-cancel-sheet">{open ? 'open' : 'closed'}</div>
  ),
}));

vi.mock(
  '@/components/service/trial-instances/reach-sales/ReachSalesButton',
  () => ({
    ReachSalesButton: ({
      deploymentRequestType,
    }: {
      deploymentRequestType?: DeploymentRequestDeploymentType;
    }) => (
      <div
        data-testid="reach-sales-button"
        data-deployment-request-type={deploymentRequestType}
      />
    ),
  })
);

const buildBundle = (
  overrides: Partial<XtmPlatformBundleDetailsFragment> = {}
): XtmPlatformBundleDetailsFragment => ({
  id: 'bundle-1',
  service_instance_id: 'service-instance-1',
  organization_name: 'ACME',
  start_date: null,
  end_date: null,
  hub_status: DeploymentRequestHubStatus.Pending,
  requester_email: 'requester@acme.io',
  request_date: '2025-01-01T00:00:00.000Z',
  cancellation_date: null,
  children: [],
  ...overrides,
});

const formView = (
  hasOngoingStandaloneTrials = false
): XtmPlatformTrialPanelView => ({
  kind: 'form',
  hasOngoingStandaloneTrials,
});

const statusView = (
  overrides: Partial<Extract<XtmPlatformTrialPanelView, { kind: 'status' }>>
): XtmPlatformTrialPanelView => ({
  kind: 'status',
  state: XtmPlatformTrialStatusPanelState.RequestInProgress,
  stepIndex: 0,
  ...overrides,
});

describe('PrivateXtmPlatformTrialPanel', () => {
  beforeEach(() => {
    graphqlMocks.useCreateDeploymentRequestMutation.mockReset();
    graphqlMocks.mutate.mockReset();
    graphqlMocks.useCreateDeploymentRequestMutation.mockReturnValue({
      mutate: graphqlMocks.mutate,
    });
    capturedHandleSubmit = undefined;
  });

  it('renders nothing while the view is not resolved yet', () => {
    const { container } = testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={null}
        ongoingStandaloneTrials={[]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the personal space message when the view is personalSpace', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={{ kind: 'personalSpace' }}
        ongoingStandaloneTrials={[]}
      />
    );

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.PersonalSpace.Title')
    ).toBeInTheDocument();
  });

  it('renders the not-admin message when the view is notAllowed', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={{ kind: 'notAllowed' }}
        ongoingStandaloneTrials={[]}
      />
    );

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.NotAdmin.Title')
    ).toBeInTheDocument();
  });

  it('renders the form without the ongoing trial flag when there are no ongoing standalone trials', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={formView(false)}
        ongoingStandaloneTrials={[]}
      />
    );

    expect(screen.getByTestId('xtm-platform-trial-form')).toHaveTextContent(
      'no-ongoing'
    );
  });

  it('renders the form with the ongoing trial flag when there are ongoing standalone trials', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={formView(true)}
        ongoingStandaloneTrials={[PlatformIdentifier.Opencti]}
      />
    );

    expect(screen.getByTestId('xtm-platform-trial-form')).toHaveTextContent(
      'has-ongoing'
    );
  });

  it('submits a bundle deployment request with only the entries that have a use case', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={formView(false)}
        ongoingStandaloneTrials={[]}
      />
    );

    capturedHandleSubmit?.({
      region: 'eu',
      job_title: 'CISO',
      activity_sector: 'IT',
      acceptTerms: true,
      use_cases_by_product: [
        {
          platform_identifier: PlatformIdentifier.Opencti,
          use_case: DeploymentRequestUseCase.ThreatHunting,
        },
        {
          platform_identifier: PlatformIdentifier.Openaev,
          use_case: undefined,
        },
      ],
    });

    expect(graphqlMocks.mutate).toHaveBeenCalledWith({
      input: {
        region: 'eu',
        job_title: 'CISO',
        activity_sector: 'IT',
        use_cases_by_product: [
          {
            platform_identifier: PlatformIdentifier.Opencti,
            use_case: DeploymentRequestUseCase.ThreatHunting,
          },
        ],
        type: DeploymentRequestDeploymentType.Bundle,
        source: DeploymentRequestSource.Xtmhub,
      },
    });
  });

  it.each([0, 1])(
    'renders the status panel with the in-progress state and step index %s',
    (stepIndex) => {
      testRender(
        <PrivateXtmPlatformTrialPanel
          bundle={buildBundle()}
          view={statusView({ stepIndex })}
          ongoingStandaloneTrials={[]}
        />
      );

      expect(
        screen.getByTestId('xtm-platform-trial-status-panel')
      ).toBeInTheDocument();
      expect(screen.getByTestId('panel-state')).toHaveTextContent(
        'request-in-progress'
      );
      expect(screen.getByTestId('panel-step-index')).toHaveTextContent(
        String(stepIndex)
      );
      expect(screen.getByTestId('panel-date-rows')).toHaveTextContent(
        JSON.stringify([
          { labelKey: 'RequestedOn', date: '2025-01-01T00:00:00.000Z' },
        ])
      );
    }
  );

  it.each([
    [XtmPlatformTrialStatusPanelState.Cancelled, 'cancelled'],
    [XtmPlatformTrialStatusPanelState.Expired, 'expired'],
    [XtmPlatformTrialStatusPanelState.Failed, 'failed'],
  ])('renders the status panel with the %s state', (state, panelState) => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={buildBundle({
          start_date: '2025-02-01T00:00:00.000Z',
          end_date: '2025-02-15T00:00:00.000Z',
          cancellation_date: '2025-02-10T00:00:00.000Z',
        })}
        view={statusView({ state, stepIndex: undefined })}
        ongoingStandaloneTrials={[]}
      />
    );

    expect(
      screen.getByTestId('xtm-platform-trial-status-panel')
    ).toBeInTheDocument();
    expect(screen.getByTestId('panel-state')).toHaveTextContent(panelState);
    expect(screen.getByTestId('panel-step-index')).toBeEmptyDOMElement();

    const isCancelled = state === XtmPlatformTrialStatusPanelState.Cancelled;
    const expectedSecondRow = isCancelled
      ? { labelKey: 'CancelledOn', date: '2025-02-10T00:00:00.000Z' }
      : { labelKey: 'FinishedOn', date: '2025-02-15T00:00:00.000Z' };
    expect(screen.getByTestId('panel-date-rows')).toHaveTextContent(
      JSON.stringify([
        { labelKey: 'StartedOn', date: '2025-02-01T00:00:00.000Z' },
        expectedSecondRow,
      ])
    );
  });

  it('passes the bundle children with a platform identifier as products', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={buildBundle({
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              service_instance_id: 'child-1',
              url: null,
              service_instance: null,
              registered_platform: null,
            },
            {
              platform_identifier: null,
              service_instance_id: 'child-2',
              url: null,
              service_instance: null,
              registered_platform: null,
            },
          ],
        })}
        view={statusView({ stepIndex: 0 })}
        ongoingStandaloneTrials={[]}
      />
    );

    expect(screen.getByTestId('panel-products')).toHaveTextContent(
      JSON.stringify([PlatformIdentifier.Opencti])
    );
  });

  it('opens the cancel sheet when the cancel action is triggered for an in-progress bundle', async () => {
    const { user } = testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={buildBundle()}
        view={statusView({ stepIndex: 0 })}
        ongoingStandaloneTrials={[]}
      />
    );

    expect(screen.queryByTestId('reach-sales-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('bundle-cancel-sheet')).toHaveTextContent(
      'closed'
    );

    await user.click(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Status.CancelTrialRequest'
      )
    );

    expect(screen.getByTestId('bundle-cancel-sheet')).toHaveTextContent('open');
  });

  it.each([
    XtmPlatformTrialStatusPanelState.Cancelled,
    XtmPlatformTrialStatusPanelState.Expired,
    XtmPlatformTrialStatusPanelState.Failed,
  ])(
    'renders the reach-sales button instead of a cancel action when the state is %s',
    (state) => {
      testRender(
        <PrivateXtmPlatformTrialPanel
          bundle={buildBundle()}
          view={statusView({
            state,
            stepIndex: undefined,
          })}
          ongoingStandaloneTrials={[]}
        />
      );

      expect(screen.getByTestId('reach-sales-button')).toBeInTheDocument();
      expect(screen.getByTestId('reach-sales-button')).toHaveAttribute(
        'data-deployment-request-type',
        DeploymentRequestDeploymentType.Bundle
      );
      expect(
        screen.queryByText(
          'Service.Trials.XtmPlatform.Page.Status.CancelTrialRequest'
        )
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('bundle-cancel-sheet')
      ).not.toBeInTheDocument();
    }
  );
});
