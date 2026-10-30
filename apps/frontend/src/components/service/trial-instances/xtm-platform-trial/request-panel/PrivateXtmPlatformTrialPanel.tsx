'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { invalidatePrivateNavigationQueries } from '@/components/menu/navigation/private/private-navigation-query-invalidation';
import { XTM_PLATFORM_TRIAL_PRODUCTS } from '@/components/service/trial-instances/form-constants';
import { ReachSalesButton } from '@/components/service/trial-instances/reach-sales/ReachSalesButton';
import {
  XtmPlatformTrialForm,
  xtmPlatformTrialFormSchema,
} from '@/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm';
import { TrialOrganizationAdminContacts } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/TrialOrganizationAdminContacts';
import { XtmPlatformTrialMessagePanel } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/XtmPlatformTrialMessagePanel';
import {
  XtmPlatformTrialStatusPanel,
  XtmPlatformTrialStatusPanelDateRow,
} from '@/components/service/trial-instances/xtm-platform-trial/request-panel/XtmPlatformTrialStatusPanel';
import {
  XtmPlatformTrialPanelView,
  XtmPlatformTrialStatusPanelState,
} from '@/components/service/trial-instances/xtm-platform-trial/request-panel/xtm-platform-trial-panel.utils';
import { BundleCancelSheet } from '@/components/service/trial-instances/xtm-platform-trial/shared/BundleCancelSheet';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import {
  DeploymentRequestSource,
  useCreateDeploymentRequestMutation,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { z } from 'zod';

interface PrivateXtmPlatformTrialPanelProps {
  bundle: XtmPlatformBundleDetailsFragment | null;
  view: XtmPlatformTrialPanelView;
}

export const PrivateXtmPlatformTrialPanel = ({
  bundle,
  view,
}: PrivateXtmPlatformTrialPanelProps) => {
  const { me } = useContext(PortalContext);
  const t = useTranslate();
  const organizationId = me?.selected_organization_id ?? '';
  const [isCancelSheetOpen, setIsCancelSheetOpen] = useState(false);

  const queryClient = useQueryClient();
  const { mutate, isPending } = useCreateDeploymentRequestMutation(
    portalGraphqlClient,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: xtmPlatformBundleKeys.all(),
        });
        invalidatePrivateNavigationQueries(queryClient);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('Service.Trials.Form.FormRequested'),
        });
      },
    }
  );

  const handleSubmit = (values: z.infer<typeof xtmPlatformTrialFormSchema>) => {
    const { acceptTerms: _, ...rest } = values;
    mutate({
      input: {
        ...rest,
        products: XTM_PLATFORM_TRIAL_PRODUCTS,
        source: DeploymentRequestSource.Xtmhub,
      },
    });
  };

  if (view.kind === 'personalSpace') {
    return (
      <XtmPlatformTrialMessagePanel
        title={t('Service.Trials.XtmPlatform.Page.PersonalSpace.Title')}
        description={t('Service.Trials.InfoPersonalSpace')}
      />
    );
  }

  if (view.kind === 'notAllowed') {
    return (
      <XtmPlatformTrialMessagePanel
        title={t('Service.Trials.XtmPlatform.Page.NotAdmin.Title')}
        description={t('Service.Trials.XtmPlatform.Page.NotAdmin.Description')}
        details={
          <TrialOrganizationAdminContacts organizationId={organizationId} />
        }
      />
    );
  }

  if (view.kind === 'status' && bundle) {
    const { state, stepIndex } = view;
    const isInProgress = stepIndex !== undefined;
    const isCancelled = state === XtmPlatformTrialStatusPanelState.Cancelled;

    const dateRows: XtmPlatformTrialStatusPanelDateRow[] = isInProgress
      ? [{ labelKey: 'RequestedOn', date: bundle.request_date }]
      : [
          { labelKey: 'StartedOn', date: bundle.start_date },
          {
            labelKey: isCancelled ? 'CancelledOn' : 'FinishedOn',
            date: isCancelled ? bundle.cancellation_date : bundle.end_date,
          },
        ];

    const actions = isInProgress ? (
      <Button
        variant="destructive"
        priority="secondary"
        onClick={() => setIsCancelSheetOpen(true)}>
        {t('Service.Trials.XtmPlatform.Page.Status.CancelTrialRequest')}
      </Button>
    ) : (
      <ReachSalesButton variant="default" />
    );

    return (
      <>
        <XtmPlatformTrialStatusPanel
          state={state}
          requesterEmail={bundle.requester_email ?? ''}
          dateRows={dateRows}
          stepIndex={stepIndex}
          actions={actions}
        />
        {isInProgress && (
          <BundleCancelSheet
            deploymentRequestId={bundle.id}
            open={isCancelSheetOpen}
            setOpen={setIsCancelSheetOpen}
          />
        )}
      </>
    );
  }

  return (
    <XtmPlatformTrialForm
      handleSubmit={handleSubmit}
      isSubmitting={isPending}
    />
  );
};
