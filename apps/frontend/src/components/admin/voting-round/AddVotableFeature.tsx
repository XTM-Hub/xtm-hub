import VotableFeatureForm, {
  VotableFeatureFormValues,
} from '@/components/admin/voting-round/VotableFeatureForm';
import {
  buildVotableFeatureInput,
  extractIllustrationFiles,
  toGraphqlUploads,
} from '@/components/admin/voting-round/votable-feature.utils';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import { Button, toast } from '@filigran/ui';
import {
  VotableFeatureCreateDocument,
  VotableFeatureCreateMutation,
  VotableFeatureCreateMutationVariables,
  useVotableFeatureCreateMutation,
} from '@graphql/generated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { invalidateVotingRoundQueries } from './voting-round-query-invalidation';

const AddVotableFeature = ({
  roundId,
  serviceInstanceId,
}: {
  roundId: string;
  serviceInstanceId: string;
}) => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);
  const queryClient = useQueryClient();

  const onSuccess = () => {
    setOpenSheet(false);
    invalidateVotingRoundQueries(queryClient);
    toast({ title: t('Utils.Success') });
  };

  const onError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'UnknownError';
    toast({
      variant: 'destructive',
      title: t('Utils.Error'),
      description: <>{t(`Error.Server.${errorMessage}`)}</>,
    });
  };

  const { mutate: createVotableFeature } = useVotableFeatureCreateMutation(
    portalGraphqlClient,
    { onSuccess, onError }
  );

  // An illustration cannot travel through graphql-request, which serialises
  // every variable as JSON, so it goes through a multipart request instead.
  const { mutate: createVotableFeatureWithIllustration } = useMutation({
    mutationFn: ({
      variables,
      files,
    }: {
      variables: VotableFeatureCreateMutationVariables;
      files: File[];
    }) =>
      requestGraphqlWithUploads<VotableFeatureCreateMutation>(
        VotableFeatureCreateDocument,
        variables,
        toGraphqlUploads(files)
      ),
    onSuccess,
    onError,
  });

  const onSubmit = (values: VotableFeatureFormValues) => {
    const files = extractIllustrationFiles(values);
    const variables = {
      input: {
        voting_round_id: roundId,
        ...buildVotableFeatureInput(values),
      },
      document: null,
    };

    if (files.length > 0) {
      createVotableFeatureWithIllustration({ variables, files });
      return;
    }
    createVotableFeature(variables);
  };

  return (
    <SheetWithPreventingDialog
      title={t('VotingRound.Feature.Actions.Add')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={<Button>{t('VotingRound.Feature.Actions.Add')}</Button>}>
      <VotableFeatureForm
        serviceInstanceId={serviceInstanceId}
        onClose={() => setOpenSheet(false)}
        handleSubmit={onSubmit}
      />
    </SheetWithPreventingDialog>
  );
};

export default AddVotableFeature;
