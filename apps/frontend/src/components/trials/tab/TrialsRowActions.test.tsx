import { TrialsRowActions } from '@/components/trials/tab/TrialsRowActions';
import { TrialsTabType } from '@/components/trials/trials.const';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformRegion,
  ReorderDeploymentRequestInQueueDirection,
  TrialsAdminCancelDeploymentRequestMutation,
  TrialsAdminCancelDeploymentRequestMutationVariables,
  TrialsReorderDeploymentRequestInQueueMutation,
  TrialsReorderDeploymentRequestInQueueMutationVariables,
  TrialsRowFragment,
} from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showSnackbarMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

const DEPLOYMENT_REQUEST_ID = 'deployment-request-1';
const SERVICE_INSTANCE_ID = 'service-instance-1';
const MANAGE_USERS_HREF = `/app/service/xtm-platform-trial/${SERVICE_INSTANCE_ID}/manage-users?from=dashboard`;
const CANCEL_LABEL = 'TrialsDashboard.Actions.CancelBundle';
const MOVE_TO_TOP_LABEL = 'TrialsDashboard.Actions.MoveToTop';
const MOVE_UP_LABEL = 'TrialsDashboard.Actions.MoveUp';
const MANAGE_USERS_LABEL = 'Service.Trials.ManageUsers.Title';
const GQL_OPERATION_CANCEL = 'TrialsAdminCancelDeploymentRequest';
const GQL_OPERATION_REORDER = 'TrialsReorderDeploymentRequestInQueue';

const buildRequest = (
  overrides: Partial<TrialsRowFragment> = {}
): TrialsRowFragment => ({
  id: DEPLOYMENT_REQUEST_ID,
  service_instance_id: SERVICE_INSTANCE_ID,
  ordering: 1,
  hub_status: DeploymentRequestHubStatus.Queued,
  requester_email: 'requester@acme.io',
  organization_name: 'ACME',
  region: DeploymentRequestPlatformRegion.EuWest,
  request_date: '2026-01-01T00:00:00.000Z',
  start_date: null,
  end_date: null,
  cancellation_date: null,
  cancellation_user_email: null,
  cancellation_reason: null,
  children: [],
  ...overrides,
});

describe('TrialsRowActions', () => {
  beforeEach(() => {
    showSnackbarMock.mockReset();
  });

  it.each([
    {
      actionLabel: MOVE_TO_TOP_LABEL,
      direction: ReorderDeploymentRequestInQueueDirection.Top,
    },
    {
      actionLabel: MOVE_UP_LABEL,
      direction: ReorderDeploymentRequestInQueueDirection.Up,
    },
  ])(
    'should reorder the bundle and confirm it when $actionLabel is clicked',
    async ({ actionLabel, direction }) => {
      // Given
      let capturedVariables:
        TrialsReorderDeploymentRequestInQueueMutationVariables | undefined;
      mswServer.use(
        graphql.mutation<
          TrialsReorderDeploymentRequestInQueueMutation,
          TrialsReorderDeploymentRequestInQueueMutationVariables
        >(GQL_OPERATION_REORDER, ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: { reorderDeploymentRequestInQueue: { success: true } },
          });
        })
      );
      const { user } = testRender(
        <TrialsRowActions
          request={buildRequest()}
          type={TrialsTabType.Waiting}
          canModifyTrials
          isAdminByPass={false}
        />
      );

      // When
      await user.click(screen.getByRole('button', { name: actionLabel }));

      // Then
      await waitFor(() => {
        expect(showSnackbarMock).toHaveBeenCalledWith({
          severity: 'success',
          title: 'Utils.Success',
          description: 'TrialsDashboard.Toast.BundleReordered',
        });
      });
      expect(capturedVariables).toEqual({
        input: { id: DEPLOYMENT_REQUEST_ID, direction },
      });
    }
  );

  it.each([
    {
      type: TrialsTabType.Running,
      hubStatus: DeploymentRequestHubStatus.Active,
    },
    {
      type: TrialsTabType.Waiting,
      hubStatus: DeploymentRequestHubStatus.Queued,
    },
  ])(
    'should cancel the $hubStatus bundle and confirm it when the cancellation is confirmed on the $type tab',
    async ({ type, hubStatus }) => {
      // Given
      let capturedVariables:
        TrialsAdminCancelDeploymentRequestMutationVariables | undefined;
      mswServer.use(
        graphql.mutation<
          TrialsAdminCancelDeploymentRequestMutation,
          TrialsAdminCancelDeploymentRequestMutationVariables
        >(GQL_OPERATION_CANCEL, ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: {
              adminCancelDeploymentRequest: { id: DEPLOYMENT_REQUEST_ID },
            },
          });
        })
      );
      const { user } = testRender(
        <TrialsRowActions
          request={buildRequest({ hub_status: hubStatus })}
          type={type}
          canModifyTrials
          isAdminByPass={false}
        />
      );

      // When
      await user.click(screen.getByRole('button', { name: CANCEL_LABEL }));
      await user.click(
        await screen.findByRole('button', { name: 'MenuActions.Delete' })
      );

      // Then
      await waitFor(() => {
        expect(showSnackbarMock).toHaveBeenCalledWith({
          severity: 'success',
          title: 'Utils.Success',
          description: 'TrialsDashboard.Toast.BundleCancelled',
        });
      });
      expect(capturedVariables).toEqual({
        deploymentRequestId: DEPLOYMENT_REQUEST_ID,
      });
    }
  );

  it.each([
    {
      type: TrialsTabType.Running,
      hubStatus: DeploymentRequestHubStatus.Active,
      canModifyTrials: false,
    },
    {
      type: TrialsTabType.Cancelled,
      hubStatus: DeploymentRequestHubStatus.Cancelled,
      canModifyTrials: true,
    },
  ])(
    'should hide the cancel action when the tab is $type and canModifyTrials is $canModifyTrials',
    ({ type, hubStatus, canModifyTrials }) => {
      // Given
      const request = buildRequest({ hub_status: hubStatus });

      // When
      testRender(
        <TrialsRowActions
          request={request}
          type={type}
          canModifyTrials={canModifyTrials}
          isAdminByPass={false}
        />
      );

      // Then
      expect(
        screen.queryByRole('button', { name: CANCEL_LABEL })
      ).not.toBeInTheDocument();
    }
  );

  it.each([
    {
      type: TrialsTabType.Waiting,
      hubStatus: DeploymentRequestHubStatus.Queued,
      canModifyTrials: false,
    },
    {
      type: TrialsTabType.Running,
      hubStatus: DeploymentRequestHubStatus.Active,
      canModifyTrials: true,
    },
  ])(
    'should hide the reorder actions when the tab is $type and canModifyTrials is $canModifyTrials',
    ({ type, hubStatus, canModifyTrials }) => {
      // Given
      const request = buildRequest({ hub_status: hubStatus });

      // When
      testRender(
        <TrialsRowActions
          request={request}
          type={type}
          canModifyTrials={canModifyTrials}
          isAdminByPass={false}
        />
      );

      // Then
      expect([
        screen.queryByRole('button', { name: MOVE_TO_TOP_LABEL }),
        screen.queryByRole('button', { name: MOVE_UP_LABEL }),
      ]).toEqual([null, null]);
    }
  );

  it('should link to the bundle user management when an admin views an active running bundle', () => {
    // Given
    const request = buildRequest({
      hub_status: DeploymentRequestHubStatus.Active,
    });

    // When
    testRender(
      <TrialsRowActions
        request={request}
        type={TrialsTabType.Running}
        canModifyTrials
        isAdminByPass
      />
    );

    // Then
    expect(
      screen.getByRole('link', { name: MANAGE_USERS_LABEL })
    ).toHaveAttribute('href', MANAGE_USERS_HREF);
  });

  it.each([
    {
      hubStatus: DeploymentRequestHubStatus.Active,
      isAdminByPass: false,
    },
    {
      hubStatus: DeploymentRequestHubStatus.Pending,
      isAdminByPass: true,
    },
  ])(
    'should hide the user management link when the running bundle is $hubStatus and isAdminByPass is $isAdminByPass',
    ({ hubStatus, isAdminByPass }) => {
      // Given
      const request = buildRequest({ hub_status: hubStatus });

      // When
      testRender(
        <TrialsRowActions
          request={request}
          type={TrialsTabType.Running}
          canModifyTrials
          isAdminByPass={isAdminByPass}
        />
      );

      // Then
      expect(
        screen.queryByRole('link', { name: MANAGE_USERS_LABEL })
      ).not.toBeInTheDocument();
    }
  );
});
