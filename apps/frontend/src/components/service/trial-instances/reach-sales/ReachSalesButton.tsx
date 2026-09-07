'use client';
import { ReachSalesMutation } from '@/components/service/trial-instances/reach-sales.graphql';
import { ReachSalesDialogForm } from '@/components/service/trial-instances/reach-sales/ReachSalesDialogForm';
import { DialogInformative } from '@/components/ui/Dialog';
import { toast } from '@filigran/ui';
import { Button, GradientButton } from '@filigran/ui/servers';
import {
  DeploymentRequestDeploymentType,
  PlatformIdentifier,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-relay';

interface ReachSalesButtonProps {
  variant: 'default' | 'gradient' | 'secondary';
  platformIdentifier?: PlatformIdentifier;
  platformId?: string;
  deploymentRequestType?: DeploymentRequestDeploymentType;
}

export const ReachSalesButton = ({
  variant,
  platformId,
  platformIdentifier,
  deploymentRequestType,
}: ReachSalesButtonProps) => {
  const t = useTranslations();
  const [commitReachSalesMutation, isInFlight] =
    useMutation(ReachSalesMutation);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);
  const [isInformationDialogOpen, setIsInformationDialogOpen] = useState(false);

  const handleReachSales = (message: string) => {
    commitReachSalesMutation({
      variables: {
        message,
        platformId,
        platformIdentifier,
        deploymentRequestType,
      },
      onError(error) {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
      onCompleted() {
        setIsConfirmationDialogOpen(false);
        setIsInformationDialogOpen(true);
      },
    });
  };

  const reachSalesButton = useMemo(() => {
    if ('gradient' === variant) {
      return (
        <GradientButton
          className="bg-background dark:bg-none"
          onClick={() => setIsConfirmationDialogOpen(true)}
          disabled={isInFlight}>
          {t('Service.Trials.ReachOutToSales')}
        </GradientButton>
      );
    }

    if ('secondary' === variant) {
      return (
        <Button
          onClick={() => setIsConfirmationDialogOpen(true)}
          variant="secondary"
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
      <DialogInformative
        isOpen={isInformationDialogOpen}
        onClose={() => setIsInformationDialogOpen(false)}
        title={t('Service.Trials.ReachOutToSalesSuccessTitle')}>
        {t('Service.Trials.ReachOutToSalesSuccessMessage')}
      </DialogInformative>
    </>
  );
};
