import VotableFeatureForm, {
  VotableFeatureFormModel,
  VotableFeatureFormValues,
} from '@/components/admin/voting-round/VotableFeatureForm';
import {
  buildVotableFeatureInput,
  extractIllustrationFiles,
  resolveIllustrationDocumentId,
  toGraphqlUploads,
} from '@/components/admin/voting-round/votable-feature.utils';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import { toast } from '@filigran/ui';
import {
  useVotableFeatureDeleteMutation,
  useVotableFeatureUpdateMutation,
  VotableFeatureUpdateDocument,
  VotableFeatureUpdateMutation,
  VotableFeatureUpdateMutationVariables,
} from '@graphql/generated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { invalidateVotingRoundQueries } from './voting-round-query-invalidation';

const EditVotableFeature = ({
  open,
  onClose,
  feature,
  serviceInstanceId,
}: {
  open: boolean;
  onClose: () => void;
  feature: VotableFeatureFormModel;
  serviceInstanceId: string;
}) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [openSheet, setOpenSheet] = useState<boolean>(open);

  const handleError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'UnknownError';
    toast({
      variant: 'destructive',
      title: t('Utils.Error'),
      description: <>{t(`Error.Server.${errorMessage}`)}</>,
    });
  };

  const handleOpenSheet = (openValue: boolean) => {
    setOpenSheet((previousState) => {
      const sheetIsClosing = previousState !== openValue && !openValue;
      if (sheetIsClosing) {
        onClose();
      }
      return openValue;
    });
  };

  const handleSuccess = () => {
    toast({ title: t('Utils.Success') });
    invalidateVotingRoundQueries(queryClient);
    handleOpenSheet(false);
  };

  const { mutate: updateVotableFeature } = useVotableFeatureUpdateMutation(
    portalGraphqlClient,
    { onSuccess: handleSuccess, onError: handleError }
  );

  // An illustration cannot travel through graphql-request, which serialises
  // every variable as JSON, so it goes through a multipart request instead.
  const { mutate: updateVotableFeatureWithIllustration } = useMutation({
    mutationFn: ({
      variables,
      files,
    }: {
      variables: VotableFeatureUpdateMutationVariables;
      files: File[];
    }) =>
      requestGraphqlWithUploads<VotableFeatureUpdateMutation>(
        VotableFeatureUpdateDocument,
        variables,
        toGraphqlUploads(files)
      ),
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const { mutate: deleteVotableFeature } = useVotableFeatureDeleteMutation(
    portalGraphqlClient,
    { onSuccess: handleSuccess, onError: handleError }
  );

  const onUpdate = (values: VotableFeatureFormValues) => {
    const files = extractIllustrationFiles(values);
    const variables = {
      id: feature.id,
      input: {
        ...buildVotableFeatureInput(values),
        illustration_document_id: resolveIllustrationDocumentId(
          values,
          feature.illustration_document_id
        ),
      },
      document: null,
    };

    if (files.length > 0) {
      updateVotableFeatureWithIllustration({ variables, files });
      return;
    }
    updateVotableFeature(variables);
  };

  return (
    <SheetWithPreventingDialog
      title={t('VotingRound.Feature.Actions.Edit')}
      setOpen={handleOpenSheet}
      open={openSheet}>
      <VotableFeatureForm
        key={feature.id}
        feature={feature}
        serviceInstanceId={serviceInstanceId}
        onClose={() => handleOpenSheet(false)}
        handleDelete={() => deleteVotableFeature({ id: feature.id })}
        handleSubmit={onUpdate}
      />
    </SheetWithPreventingDialog>
  );
};

export default EditVotableFeature;
