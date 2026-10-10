import VotingRoundForm, {
  VotingRoundFormModel,
  votingRoundFormSchema,
} from '@/components/admin/voting-round/VotingRoundForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  useVotingRoundDeleteMutation,
  useVotingRoundUpdateMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { invalidateVotingRoundQueries } from './voting-round-query-invalidation';

const EditVotingRound = ({
  open,
  onClose,
  votingRound,
}: {
  open: boolean;
  onClose: () => void;
  votingRound: VotingRoundFormModel;
}) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [openSheet, setOpenSheet] = useState<boolean>(open);
  // Shared by every closure, so a repeated or late close notifies once.
  const openSheetRef = useRef(openSheet);

  const handleError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'UnknownError';
    showSnackbar({
      severity: 'error',
      title: t('Utils.Error'),
      description: <>{t(`Error.Server.${errorMessage}`)}</>,
    });
  };

  const handleOpenSheet = (openValue: boolean) => {
    if (openSheetRef.current && !openValue) {
      onClose();
    }
    openSheetRef.current = openValue;
    setOpenSheet(openValue);
  };

  const { mutate: updateVotingRound } = useVotingRoundUpdateMutation(
    portalGraphqlClient,
    {
      onSuccess: () => {
        showSnackbar({ severity: 'success', title: t('Utils.Success') });
        invalidateVotingRoundQueries(queryClient);
        handleOpenSheet(false);
      },
      onError: handleError,
    }
  );

  const { mutate: deleteVotingRound } = useVotingRoundDeleteMutation(
    portalGraphqlClient,
    {
      onSuccess: () => {
        showSnackbar({ severity: 'success', title: t('Utils.Success') });
        invalidateVotingRoundQueries(queryClient);
        handleOpenSheet(false);
      },
      onError: handleError,
    }
  );

  const onUpdate = (values: z.infer<typeof votingRoundFormSchema>) => {
    updateVotingRound({
      id: votingRound.id,
      input: {
        name: values.name,
        description: values.description || null,
        theme: values.theme,
      },
    });
  };

  return (
    <SheetWithPreventingDialog
      title={t('VotingRound.Actions.Edit')}
      setOpen={handleOpenSheet}
      open={openSheet}>
      <VotingRoundForm
        key={votingRound.id}
        votingRound={votingRound}
        onClose={() => handleOpenSheet(false)}
        handleDelete={() => deleteVotingRound({ id: votingRound.id })}
        handleSubmit={onUpdate}
      />
    </SheetWithPreventingDialog>
  );
};

export default EditVotingRound;
