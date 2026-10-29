import { PrivateXtmPlatformTrialPanel } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/PrivateXtmPlatformTrialPanel';
import {
  XtmPlatformTrialPanelView,
  XtmPlatformTrialStatusPanelState,
} from '@/components/service/trial-instances/xtm-platform-trial/request-panel/xtm-platform-trial-panel.utils';
import testRender from '@/utils/test/test-render';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import {
  DeploymentRequestHubStatus,
  DeploymentRequestSource,
  DeploymentRequestUseCase,
  PlatformIdentifier,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlMocks = vi.hoisted(() => ({
  useCreateDeploymentRequestMutation: vi.fn(),
  mutate: vi.fn(),
}));

const queryMocks = vi.hoisted(() => ({
  invalidatePrivateNavigationQueries: vi.fn(),
}));

vi.mock(
  '@/components/menu/navigation/private/private-navigation-query-invalidation',
  () => ({
    invalidatePrivateNavigationQueries:
      queryMocks.invalidatePrivateNavigationQueries,
  })
);

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
  '@/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm',
  () => ({
    XtmPlatformTrialForm: ({
      handleSubmit,
      isSubmitting,
    }: {
      handleSubmit: typeof capturedHandleSubmit;
      isSubmitting?: boolean;
    }) => {
      capturedHandleSubmit = handleSubmit;
      return (
        <button
          type="submit"
          data-testid="xtm-platform-trial-form"
          disabled={isSubmitting}
        />
      );
    },
    xtmPlatformTrialFormSchema: {},
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/request-panel/TrialOrganizationAdminContacts',
  () => ({
    TrialOrganizationAdminContacts: ({
      organizationId,
    }: {
      organizationId: string;
    }) => (
      <div data-testid="trial-organization-admin-contacts">
        {organizationId}
      </div>
    ),
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/request-panel/XtmPlatformTrialStatusPanel',
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

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/shared/BundleCancelSheet',
  () => ({
    BundleCancelSheet: ({ open }: { open: boolean }) => (
      <div data-testid="bundle-cancel-sheet">{open ? 'open' : 'closed'}</div>
    ),
  })
);

vi.mock(
  '@/components/service/trial-instances/reach-sales/ReachSalesButton',
  () => ({
    ReachSalesButton: () => <div data-testid="reach-sales-button" />,
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

const formView: XtmPlatformTrialPanelView = { kind: 'form' };

const statusView = (
  overrides: Partial<Extract<XtmPlatformTrialPanelView, { kind: 'status' }>>
): XtmPlatformTrialPanelView => ({
  kind: 'status',
  state: XtmPlatformTrialStatusPanelState.RequestInProgress,
  stepIndex: 0,
  ...overrides,
});

describe('PrivateXtmPlatformTrialPanel', () => {
  let invalidateQueries: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    invalidateQueries = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    graphqlMocks.useCreateDeploymentRequestMutation.mockReset();
    graphqlMocks.mutate.mockReset();
    graphqlMocks.useCreateDeploymentRequestMutation.mockReturnValue({
      mutate: graphqlMocks.mutate,
    });
    capturedHandleSubmit = undefined;
    queryMocks.invalidatePrivateNavigationQueries.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refreshes the bundle and the navigation queries after a successful request', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={formView}
      />
    );

    expect(
      queryMocks.invalidatePrivateNavigationQueries
    ).not.toHaveBeenCalled();

    const [, options] =
      graphqlMocks.useCreateDeploymentRequestMutation.mock.calls[0];
    options.onSuccess();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: xtmPlatformBundleKeys.all(),
    });
    expect(
      queryMocks.invalidatePrivateNavigationQueries
    ).toHaveBeenCalledOnce();
    expect(queryMocks.invalidatePrivateNavigationQueries).toHaveBeenCalledWith(
      expect.any(QueryClient)
    );
  });

  it('renders the personal space message when the view is personalSpace', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={{ kind: 'personalSpace' }}
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
      />
    );

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.NotAdmin.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('trial-organization-admin-contacts')
    ).toBeInTheDocument();
  });

  it('renders the form when the view is form', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={formView}
      />
    );

    expect(screen.getByTestId('xtm-platform-trial-form')).toBeInTheDocument();
  });

  it('disables the form submit while the deployment request is pending', () => {
    graphqlMocks.useCreateDeploymentRequestMutation.mockReturnValue({
      mutate: graphqlMocks.mutate,
      isPending: true,
    });

    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={formView}
      />
    );

    expect(screen.getByTestId('xtm-platform-trial-form')).toBeDisabled();
  });

  it('submits a bundle deployment request with only the entries that have a use case', () => {
    testRender(
      <PrivateXtmPlatformTrialPanel
        bundle={null}
        view={formView}
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
        />
      );

      expect(screen.getByTestId('reach-sales-button')).toBeInTheDocument();
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
