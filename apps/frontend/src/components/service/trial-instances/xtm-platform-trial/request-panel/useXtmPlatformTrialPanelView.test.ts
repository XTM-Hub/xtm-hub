import { useXtmPlatformTrialPanelView } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/useXtmPlatformTrialPanelView';
import { testRenderHook } from '@/utils/test/test-render';
import {
  DeploymentRequestHubStatus,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { describe, expect, it } from 'vitest';

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
  it('returns the personalSpace view when the organization is a personal space', () => {
    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null),
      { me: personalSpaceMe }
    );

    expect(result.current).toEqual({ kind: 'personalSpace' });
  });

  it('returns the notAllowed view when the user cannot request a trial', () => {
    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null),
      { me: { selected_org_capabilities: [] } }
    );

    expect(result.current).toEqual({ kind: 'notAllowed' });
  });

  it('returns the form view when there is no bundle and the user can request a trial', () => {
    const { result } = testRenderHook(
      () => useXtmPlatformTrialPanelView(null),
      { me: allowedMe }
    );

    expect(result.current).toEqual({ kind: 'form' });
  });

  it.each([
    [DeploymentRequestHubStatus.Queued, 0],
    [DeploymentRequestHubStatus.Pending, 0],
    [DeploymentRequestHubStatus.Provisioning, 1],
  ])(
    'returns the in-progress status view when the bundle is %s',
    (hubStatus, expectedStepIndex) => {
      const { result } = testRenderHook(
        () =>
          useXtmPlatformTrialPanelView(buildBundle({ hub_status: hubStatus })),
        { me: allowedMe }
      );

      expect(result.current).toEqual({
        kind: 'status',
        state: 'request-in-progress',
        stepIndex: expectedStepIndex,
      });
    }
  );

  it.each([
    [DeploymentRequestHubStatus.Cancelled, 'cancelled'],
    [DeploymentRequestHubStatus.Expired, 'expired'],
    [DeploymentRequestHubStatus.Failed, 'failed'],
  ])('returns the %s status view', (hubStatus, panelState) => {
    const { result } = testRenderHook(
      () =>
        useXtmPlatformTrialPanelView(buildBundle({ hub_status: hubStatus })),
      { me: allowedMe }
    );

    expect(result.current).toEqual({
      kind: 'status',
      state: panelState,
      stepIndex: undefined,
    });
  });
});
