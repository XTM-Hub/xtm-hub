'use client';
import { TrialsTabType } from '@/components/trials/trials.const';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { xtmPlatformTrialManageUsersFromDashboardPath } from '@/utils/path/constant';
import {
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import {
  ArrowShapeUpIcon,
  ArrowShapeUpStackIcon,
  CloseIcon,
  GroupIcon,
} from '@filigran/icon';
import { trialsKeys } from '@graphql/deployment/deployment.keys';
import {
  DeploymentRequestHubStatus,
  ReorderDeploymentRequestInQueueDirection,
  TrialsRowFragment,
  useTrialsAdminCancelDeploymentRequestMutation,
  useTrialsReorderDeploymentRequestInQueueMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

interface TrialsRowActionsProps {
  request: TrialsRowFragment;
  type: TrialsTabType;
  canModifyTrials: boolean;
  isAdminByPass: boolean;
}

export const TrialsRowActions = ({
  request,
  type,
  canModifyTrials,
  isAdminByPass,
}: TrialsRowActionsProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();

  const invalidateTrials = () =>
    queryClient.invalidateQueries({ queryKey: trialsKeys.all() });

  const onError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'UnknownError';
    showSnackbar({
      severity: 'error',
      title: t('Utils.Error'),
      description: <>{t(`Error.Server.${errorMessage}`)}</>,
    });
  };

  const { mutate: cancelRequest } =
    useTrialsAdminCancelDeploymentRequestMutation(portalGraphqlClient, {
      onSuccess: async () => {
        await invalidateTrials();
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('TrialsDashboard.Toast.BundleCancelled'),
        });
      },
      onError,
    });

  const { mutate: reorderRequest } =
    useTrialsReorderDeploymentRequestInQueueMutation(portalGraphqlClient, {
      onSuccess: async () => {
        await invalidateTrials();
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('TrialsDashboard.Toast.BundleReordered'),
        });
      },
      onError,
    });

  const isCancellable =
    canModifyTrials &&
    (type === TrialsTabType.Running || type === TrialsTabType.Waiting);
  const isReorderable = canModifyTrials && type === TrialsTabType.Waiting;
  const canManageUsers =
    type === TrialsTabType.Running &&
    isAdminByPass &&
    request.hub_status === DeploymentRequestHubStatus.Active;

  return (
    <>
      {isCancellable && (
        <ConfirmDialog
          confirmAnalyticsId="admin_trial_cancellation_confirm"
          title={t('Service.Trials.Cancellation.Confirmation.Title')}
          confirmLabel={t('MenuActions.Delete')}
          trigger={
            <IconButton
              variant="destructive"
              priority="tertiary"
              className="border m-1"
              {...analyticsId('admin_trial_request_cancel')}
              aria-label={t('TrialsDashboard.Actions.CancelBundle')}
              icon={<CloseIcon className="h-4 w-4" />}
            />
          }
          onConfirm={() => cancelRequest({ deploymentRequestId: request.id })}>
          {t('TrialsDashboard.Cancellation.Confirmation', {
            organizationName: request.organization_name ?? '',
          })}
        </ConfirmDialog>
      )}
      {isReorderable && (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  priority="tertiary"
                  className="border m-1"
                  {...analyticsId('admin_trial_queue_top_select')}
                  aria-label={t('TrialsDashboard.Actions.MoveToTop')}
                  icon={<ArrowShapeUpStackIcon className="h-4 w-4" />}
                  onClick={() =>
                    reorderRequest({
                      input: {
                        id: request.id,
                        direction: ReorderDeploymentRequestInQueueDirection.Top,
                      },
                    })
                  }
                />
              </TooltipTrigger>
              <TooltipContent>
                {t('TrialsDashboard.Actions.MoveToTop')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  priority="tertiary"
                  className="border m-1"
                  {...analyticsId('admin_trial_queue_up_select')}
                  aria-label={t('TrialsDashboard.Actions.MoveUp')}
                  icon={<ArrowShapeUpIcon className="h-4 w-4" />}
                  onClick={() =>
                    reorderRequest({
                      input: {
                        id: request.id,
                        direction: ReorderDeploymentRequestInQueueDirection.Up,
                      },
                    })
                  }
                />
              </TooltipTrigger>
              <TooltipContent>
                {t('TrialsDashboard.Actions.MoveUp')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
      {canManageUsers && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                asChild
                priority="tertiary"
                className="border m-1"
                aria-label={t('Service.Trials.ManageUsers.Title')}
                icon={<GroupIcon className="h-4 w-4" />}>
                <Link
                  href={xtmPlatformTrialManageUsersFromDashboardPath(
                    request.service_instance_id
                  )}
                  {...analyticsId('admin_trial_users_open')}
                />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>
              {t('Service.Trials.ManageUsers.Title')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
};
