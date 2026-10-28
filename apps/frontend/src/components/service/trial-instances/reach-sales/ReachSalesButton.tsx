'use client';
import { ReachSalesDialogForm } from '@/components/service/trial-instances/reach-sales/ReachSalesDialogForm';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import {
  DeploymentRequestDeploymentType,
  useReachSalesMutation,
} from '@graphql/generated';
import { useMemo, useState } from 'react';

interface ReachSalesButtonProps {
  variant: 'default' | 'gradient' | 'secondary';
}

export const ReachSalesButton = ({ variant }: ReachSalesButtonProps) => {
  const t = useTranslate();
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);

  const { mutate: reachSales, isPending: isInFlight } = useReachSalesMutation(
    portalGraphqlClient,
    {
      onSuccess: () => {
        showSnackbar({
          severity: 'success',
          title: t('Service.Trials.ReachOutToSalesSuccessTitle'),
          description: t('Service.Trials.ReachOutToSalesSuccessMessage'),
        });
        setIsConfirmationDialogOpen(false);
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${errorMessage}`),
        });
      },
    }
  );

  const handleReachSales = (message: string) => {
    reachSales({
      message,
      deploymentRequestType: DeploymentRequestDeploymentType.Bundle,
    });
  };

  const reachSalesButton = useMemo(() => {
    if ('gradient' === variant) {
      return (
        <Button
          variant="highlight"
          priority="secondary"
          onClick={() => setIsConfirmationDialogOpen(true)}
          disabled={isInFlight}>
          {t('Service.Trials.ReachOutToSales')}
        </Button>
      );
    }

    if ('secondary' === variant) {
      return (
        <Button
          onClick={() => setIsConfirmationDialogOpen(true)}
          priority="secondary"
          disabled={isInFlight}>
          {t('Service.Trials.ReachOutToSales')}
        </Button>
      );
    }

    return (
      <Button
        onClick={() => setIsConfirmationDialogOpen(true)}
        disabled={isInFlight}>
        {t('Service.Trials.ReachOutToSales')}
      </Button>
    );
  }, [variant, setIsConfirmationDialogOpen, isInFlight, t]);

  return (
    <>
      {reachSalesButton}
      <ReachSalesDialogForm
        isDialogOpen={isConfirmationDialogOpen}
        setIsDialogOpen={setIsConfirmationDialogOpen}
        onSubmit={(message) => handleReachSales(message)}
      />
    </>
  );
};
