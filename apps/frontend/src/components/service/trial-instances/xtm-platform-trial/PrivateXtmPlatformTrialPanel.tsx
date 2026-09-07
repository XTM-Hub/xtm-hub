'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { ReachSalesButton } from '@/components/service/trial-instances/reach-sales/ReachSalesButton';
import {
  XtmPlatformTrialForm,
  xtmPlatformTrialFormSchema,
} from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialForm';
import { XtmPlatformTrialMessagePanel } from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialMessagePanel';
import {
  XtmPlatformTrialStatusPanel,
  XtmPlatformTrialStatusPanelDateRow,
} from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialStatusPanel';
import {
  XtmPlatformTrialPanelView,
  XtmPlatformTrialStatusPanelState,
} from '@/components/service/trial-instances/xtm-platform-trial/xtm-platform-trial-panel.utils';
import { BundleCancelSheet } from '@/components/xtm-platform-trial/BundleCancelSheet';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/ui';
import { toast } from '@filigran/ui/clients';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestSource,
  PlatformIdentifier,
  PlatformTrialStatusQueryVariables,
  useCreateDeploymentRequestMutation,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { platformTrialKeys } from '@graphql/trial/trial.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { z } from 'zod';

interface PrivateXtmPlatformTrialPanelProps {
  bundle: XtmPlatformBundleDetailsFragment | null;
  view: XtmPlatformTrialPanelView | null;
  ongoingStandaloneTrials: PlatformIdentifier[];
}

export const PrivateXtmPlatformTrialPanel = ({
  bundle,
  view,
  ongoingStandaloneTrials,
}: PrivateXtmPlatformTrialPanelProps) => {
  const { me } = useContext(PortalContext);
  const t = useTranslations();
  const organizationId = me?.selected_organization_id ?? '';
  const [isCancelSheetOpen, setIsCancelSheetOpen] = useState(false);

  const variables: PlatformTrialStatusQueryVariables = { organizationId };
  const queryClient = useQueryClient();
  const { mutate } = useCreateDeploymentRequestMutation(portalGraphqlClient, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: platformTrialKeys.platformTrialStatus(variables),
      });
      toast({
        title: t('Utils.Success'),
        description: t('Service.Trials.Form.FormRequested'),
      });
    },
  });

  const handleSubmit = (values: z.infer<typeof xtmPlatformTrialFormSchema>) => {
    const { acceptTerms: _, use_cases_by_product, ...rest } = values;
    mutate({
      input: {
        ...rest,
        use_cases_by_product: use_cases_by_product.flatMap((entry) =>
          entry.use_case
            ? [
                {
                  platform_identifier: entry.platform_identifier,
                  use_case: entry.use_case,
                },
              ]
            : []
        ),
        type: DeploymentRequestDeploymentType.Bundle,
        source: DeploymentRequestSource.Xtmhub,
      },
    });
  };

  if (!view) {
    return null;
  }

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

    const products = (bundle.children ?? []).flatMap((child) =>
      child.platform_identifier ? [child.platform_identifier] : []
    );

    const actions = isInProgress ? (
      <Button
        variant="outline-destructive"
        onClick={() => setIsCancelSheetOpen(true)}>
        {t('Service.Trials.XtmPlatform.Page.Status.CancelTrialRequest')}
      </Button>
    ) : (
      <ReachSalesButton
        variant="default"
        deploymentRequestType={DeploymentRequestDeploymentType.Bundle}
      />
    );

    return (
      <>
        <XtmPlatformTrialStatusPanel
          state={state}
          requesterEmail={bundle.requester_email ?? ''}
          dateRows={dateRows}
          products={products}
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
      hasOngoingStandaloneTrials={
        view.kind === 'form' && view.hasOngoingStandaloneTrials
      }
      ongoingStandaloneTrialProducts={ongoingStandaloneTrials}
    />
  );
};
