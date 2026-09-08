import { useXtmPlatformTrialPanelView } from '@/components/service/trial-instances/xtm-platform-trial/useXtmPlatformTrialPanelView';
import { testRenderHook } from '@/utils/test/test-render';
import {
  DeploymentRequestHubStatus,
  PlatformIdentifier,
  PlatformTrialStatusQueryVariables,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlMocks = vi.hoisted(() => ({
  usePlatformTrialStatusQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((variables: PlatformTrialStatusQueryVariables) => [
      'PlatformTrialStatus',
      variables,
    ]),
    getRootKey: vi.fn(() => ['PlatformTrialStatus']),
  }),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();

  return {
    ...actual,
    usePlatformTrialStatusQuery: graphqlMocks.usePlatformTrialStatusQuery,
  };
});

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

const allowedMe = { selected_org_capabilities: ['ADMINISTRATE_ORGANIZATION'] };

const personalSpaceMe = {
  selected_organization_id: 'mock_id',
  organizations: [
    { id: 'mock_id', name: 'Personal Space', personal_space: true },
  ],
};

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

describe('useXtmPlatformTrialPanelView', () => {
  beforeEach(() => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReset();
  });

  it('returns a null view while the trial status query is loading', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isPending: true,
      isError: false,
    });

    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null),
      { me: allowedMe }
    );

    expect(result.current).toEqual({
      view: null,
      showLimitations: false,
      ongoingStandaloneTrials: [],
    });
  });

  it('returns a null view and skips fetching when disabled', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: false,
      isError: false,
    });

    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null, { enabled: false }),
      { me: allowedMe }
    );

    expect(result.current).toEqual({
      view: null,
      showLimitations: false,
      ongoingStandaloneTrials: [],
    });
    expect(graphqlMocks.usePlatformTrialStatusQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });

  it('returns the personalSpace view and hides limitations when the organization is a personal space', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: { platformTrialStatus: { ongoingStandaloneTrials: [] } },
      isLoading: false,
      isPending: false,
      isError: false,
    });

    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null),
      { me: personalSpaceMe }
    );

    expect(result.current.view).toEqual({ kind: 'personalSpace' });
    expect(result.current.showLimitations).toBe(false);
  });

  it('returns the notAllowed view and hides limitations when the user cannot request a trial', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: { platformTrialStatus: { ongoingStandaloneTrials: [] } },
      isLoading: false,
      isPending: false,
      isError: false,
    });

    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null),
      { me: { selected_org_capabilities: [] } }
    );

    expect(result.current.view).toEqual({ kind: 'notAllowed' });
    expect(result.current.showLimitations).toBe(false);
  });

  it('returns the form view and shows limitations when there is no bundle and the user can request a trial', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: { platformTrialStatus: { ongoingStandaloneTrials: [] } },
      isLoading: false,
      isPending: false,
      isError: false,
    });

    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null),
      { me: allowedMe }
    );

    expect(result.current.view).toEqual({
      kind: 'form',
      hasOngoingStandaloneTrials: false,
    });
    expect(result.current.showLimitations).toBe(true);
    expect(result.current.ongoingStandaloneTrials).toEqual([]);
  });

  it('flags ongoing standalone trials on the form view', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: {
        platformTrialStatus: {
          ongoingStandaloneTrials: [PlatformIdentifier.Opencti],
        },
      },
      isLoading: false,
      isPending: false,
      isError: false,
    });

    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null),
      { me: allowedMe }
    );

    expect(result.current.view).toEqual({
      kind: 'form',
      hasOngoingStandaloneTrials: true,
    });
    expect(result.current.ongoingStandaloneTrials).toEqual([
      PlatformIdentifier.Opencti,
    ]);
  });

  it.each([
    [DeploymentRequestHubStatus.Queued, 0],
    [DeploymentRequestHubStatus.Pending, 0],
    [DeploymentRequestHubStatus.Provisioning, 1],
  ])(
    'returns the in-progress status view and hides limitations when the bundle is %s',
    (hubStatus, expectedStepIndex) => {
      graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
        data: { platformTrialStatus: { ongoingStandaloneTrials: [] } },
        isLoading: false,
        isPending: false,
        isError: false,
      });

      const { result } = testRenderHook(
        () =>
          useXtmPlatformTrialPanelView(buildBundle({ hub_status: hubStatus })),
        { me: allowedMe }
      );

      expect(result.current.view).toEqual({
        kind: 'status',
        state: 'request-in-progress',
        stepIndex: expectedStepIndex,
      });
      expect(result.current.showLimitations).toBe(false);
    }
  );

  it.each([
    [DeploymentRequestHubStatus.Cancelled, 'cancelled'],
    [DeploymentRequestHubStatus.Expired, 'expired'],
    [DeploymentRequestHubStatus.Failed, 'failed'],
  ])(
    'returns the %s status view and hides limitations',
    (hubStatus, panelState) => {
      graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
        data: { platformTrialStatus: { ongoingStandaloneTrials: [] } },
        isLoading: false,
        isPending: false,
        isError: false,
      });

      const { result } = testRenderHook(
        () =>
          useXtmPlatformTrialPanelView(buildBundle({ hub_status: hubStatus })),
        { me: allowedMe }
      );

      expect(result.current.view).toEqual({
        kind: 'status',
        state: panelState,
        stepIndex: undefined,
      });
      expect(result.current.showLimitations).toBe(false);
    }
  );
});
