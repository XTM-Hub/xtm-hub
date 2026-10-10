'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
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
        showSnackbar({ severity: 'success', title: t('Utils.Success') });
        invalidateVotingRoundQueries(queryClient);
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        showSnackbar({
          severity: 'error',
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
      <ConfirmDialog
        title={t('VotingRound.Actions.Close')}
        confirmLabel={t('VotingRound.Actions.Close')}
        trigger={
          <Button
            priority="secondary"
            disabled={isPending}>
            {t('VotingRound.Actions.Close')}
          </Button>
        }
        onConfirm={() => changeStatus(VotingRoundStatus.Closed)}>
        {t('VotingRound.Dialog.CloseRound', { name: roundName })}
      </ConfirmDialog>
    );
  }

  return (
    <ConfirmDialog
      title={t('VotingRound.Actions.Open')}
      confirmLabel={t('VotingRound.Actions.Open')}
      trigger={
        <Button disabled={isPending || !hasFeatures}>
          {t('VotingRound.Actions.Open')}
        </Button>
      }
      onConfirm={() => changeStatus(VotingRoundStatus.Open)}>
      {t('VotingRound.Dialog.OpenRound', { name: roundName })}
    </ConfirmDialog>
  );
};
