'use client';

import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button, toast } from '@filigran/ui';
import {
  useVotingRoundSetStatusMutation,
  VotingRoundStatus,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateVotingRoundQueries } from './voting-round-query-invalidation';

interface VotingRoundStatusActionsProps {
  roundId: string;
  roundName: string;
  status: VotingRoundStatus;
  hasFeatures: boolean;
}

export const VotingRoundStatusActions = ({
  roundId,
  roundName,
  status,
  hasFeatures,
}: VotingRoundStatusActionsProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();

  const { mutate: setStatus, isPending } = useVotingRoundSetStatusMutation(
    portalGraphqlClient,
    {
      onSuccess: () => {
        toast({ title: t('Utils.Success') });
        invalidateVotingRoundQueries(queryClient);
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
      },
    }
  );

  const changeStatus = (nextStatus: VotingRoundStatus) =>
    setStatus({ id: roundId, status: nextStatus });

  if (status === VotingRoundStatus.Open) {
    return (
      <AlertDialogComponent
        AlertTitle={t('VotingRound.Actions.Close')}
        actionButtonText={t('VotingRound.Actions.Close')}
        triggerElement={
          <Button
            variant="secondary"
            disabled={isPending}>
            {t('VotingRound.Actions.Close')}
          </Button>
        }
        onClickContinue={() => changeStatus(VotingRoundStatus.Closed)}>
        {t('VotingRound.Dialog.CloseRound', { name: roundName })}
      </AlertDialogComponent>
    );
  }

  return (
    <AlertDialogComponent
      AlertTitle={t('VotingRound.Actions.Open')}
      actionButtonText={t('VotingRound.Actions.Open')}
      triggerElement={
        <Button disabled={isPending || !hasFeatures}>
          {t('VotingRound.Actions.Open')}
        </Button>
      }
      onClickContinue={() => changeStatus(VotingRoundStatus.Open)}>
      {t('VotingRound.Dialog.OpenRound', { name: roundName })}
    </AlertDialogComponent>
  );
};
