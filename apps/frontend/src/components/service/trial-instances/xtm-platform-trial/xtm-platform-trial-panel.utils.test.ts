import {
  deriveXtmPlatformTrialPanelView,
  XtmPlatformTrialPanelView,
  XtmPlatformTrialStatusPanelState,
} from '@/components/service/trial-instances/xtm-platform-trial/xtm-platform-trial-panel.utils';
import {
  DeploymentRequestHubStatus,
  PlatformIdentifier,
} from '@graphql/generated';
import { describe, expect, it } from 'vitest';

describe('deriveXtmPlatformTrialPanelView', () => {
  it.each([
    {
      description: 'the organization is a personal space',
      isPersonalSpace: true,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: undefined,
      expected: { kind: 'personalSpace' },
    },
    {
      description:
        'the organization is a personal space even with ongoing trials',
      isPersonalSpace: true,
      isAllowed: true,
      ongoingStandaloneTrials: [PlatformIdentifier.Opencti],
      hubStatus: undefined,
      expected: { kind: 'personalSpace' },
    },
    {
      description:
        'the organization is a personal space even with multiple ongoing trials',
      isPersonalSpace: true,
      isAllowed: true,
      ongoingStandaloneTrials: [
        PlatformIdentifier.Opencti,
        PlatformIdentifier.Openaev,
      ],
      hubStatus: undefined,
      expected: { kind: 'personalSpace' },
    },
    {
      description: 'the user is not allowed to request a trial',
      isPersonalSpace: false,
      isAllowed: false,
      ongoingStandaloneTrials: [],
      hubStatus: undefined,
      expected: { kind: 'notAllowed' },
    },
    {
      description:
        'the user is not allowed even though the organization has ongoing trials',
      isPersonalSpace: false,
      isAllowed: false,
      ongoingStandaloneTrials: [PlatformIdentifier.Opencti],
      hubStatus: undefined,
      expected: { kind: 'notAllowed' },
    },
    {
      description:
        'the user is not allowed even though a bundle is in progress',
      isPersonalSpace: false,
      isAllowed: false,
      ongoingStandaloneTrials: [],
      hubStatus: DeploymentRequestHubStatus.Pending,
      expected: { kind: 'notAllowed' },
    },
    {
      description:
        'the user is allowed and the organization has no ongoing trial',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: undefined,
      expected: { kind: 'form', hasOngoingStandaloneTrials: false },
    },
    {
      description:
        'the user is allowed and there is no bundle but the bundle hub status is null',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: null,
      expected: { kind: 'form', hasOngoingStandaloneTrials: false },
    },
    {
      description:
        'the user is allowed and the organization has one ongoing trial',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [PlatformIdentifier.Opencti],
      hubStatus: undefined,
      expected: { kind: 'form', hasOngoingStandaloneTrials: true },
    },
    {
      description:
        'the user is allowed and the organization has two ongoing trials',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [
        PlatformIdentifier.Opencti,
        PlatformIdentifier.Openaev,
      ],
      hubStatus: undefined,
      expected: { kind: 'form', hasOngoingStandaloneTrials: true },
    },
    {
      description: 'the bundle is queued',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: DeploymentRequestHubStatus.Queued,
      expected: {
        kind: 'status',
        state: XtmPlatformTrialStatusPanelState.RequestInProgress,
        stepIndex: 0,
      },
    },
    {
      description: 'the bundle is pending',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: DeploymentRequestHubStatus.Pending,
      expected: {
        kind: 'status',
        state: XtmPlatformTrialStatusPanelState.RequestInProgress,
        stepIndex: 0,
      },
    },
    {
      description: 'the bundle is provisioning',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: DeploymentRequestHubStatus.Provisioning,
      expected: {
        kind: 'status',
        state: XtmPlatformTrialStatusPanelState.RequestInProgress,
        stepIndex: 1,
      },
    },
    {
      description: 'the bundle is cancelled',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: DeploymentRequestHubStatus.Cancelled,
      expected: {
        kind: 'status',
        state: XtmPlatformTrialStatusPanelState.Cancelled,
        stepIndex: undefined,
      },
    },
    {
      description: 'the bundle is expired',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: DeploymentRequestHubStatus.Expired,
      expected: {
        kind: 'status',
        state: XtmPlatformTrialStatusPanelState.Expired,
        stepIndex: undefined,
      },
    },
    {
      description: 'the bundle failed',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [],
      hubStatus: DeploymentRequestHubStatus.Failed,
      expected: {
        kind: 'status',
        state: XtmPlatformTrialStatusPanelState.Failed,
        stepIndex: undefined,
      },
    },
    {
      description:
        'a terminal bundle takes precedence over ongoing standalone trials',
      isPersonalSpace: false,
      isAllowed: true,
      ongoingStandaloneTrials: [PlatformIdentifier.Opencti],
      hubStatus: DeploymentRequestHubStatus.Cancelled,
      expected: {
        kind: 'status',
        state: XtmPlatformTrialStatusPanelState.Cancelled,
        stepIndex: undefined,
      },
    },
  ])(
    'should return $expected when $description',
    ({
      isPersonalSpace,
      isAllowed,
      ongoingStandaloneTrials,
      hubStatus,
      expected,
    }) => {
      // Given the eligibility facts of the organization and its bundle
      // When deriving the panel view
      const view = deriveXtmPlatformTrialPanelView({
        isPersonalSpace,
        isAllowed,
        ongoingStandaloneTrials,
        hubStatus,
      });

      // Then the expected view is selected
      expect(view).toEqual(expected as XtmPlatformTrialPanelView);
    }
  );
});
