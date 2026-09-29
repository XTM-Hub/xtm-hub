import { useRoadmapServiceInstances } from '@/components/admin/voting-round/use-roadmap-service-instances';
import VotingRoundForm, {
  VotingRoundCopySource,
  votingRoundFormSchema,
} from '@/components/admin/voting-round/VotingRoundForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button, toast } from '@filigran/ui';
import { useVotingRoundCreateMutation } from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { invalidateVotingRoundQueries } from './voting-round-query-invalidation';

const AddVotingRound = ({
  copySources,
}: {
  copySources: VotingRoundCopySource[];
}) => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);
  const queryClient = useQueryClient();
  const serviceInstances = useRoadmapServiceInstances();

  const { mutate: createVotingRound } = useVotingRoundCreateMutation(
    portalGraphqlClient,
    {
      onSuccess: () => {
        setOpenSheet(false);
        invalidateVotingRoundQueries(queryClient);
        toast({ title: t('Utils.Success') });
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

  const onSubmit = (values: z.infer<typeof votingRoundFormSchema>) => {
    createVotingRound({
      input: {
        service_instance_id: values.service_instance_id,
        name: values.name,
        description: values.description || null,
        theme: values.theme,
        copy_features_from_round_id: values.copy_features_from_round_id ?? null,
      },
    });
  };

  return (
    <SheetWithPreventingDialog
      title={t('VotingRound.Actions.Add')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={<Button>{t('VotingRound.Actions.Add')}</Button>}>
      <VotingRoundForm
        copySources={copySources}
        serviceInstances={serviceInstances}
        onClose={() => setOpenSheet(false)}
        handleSubmit={onSubmit}
      />
    </SheetWithPreventingDialog>
  );
};

export default AddVotingRound;
