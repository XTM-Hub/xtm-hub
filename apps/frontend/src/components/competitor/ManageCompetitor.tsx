'use client';

import CompetitorForm, {
  competitorFormSchema,
} from '@/components/competitor/CompetitorForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { prependToQueryCache, updateInQueryCache } from '@/utils/query-cache';
import { competitorListKeys } from '@graphql/competitor/competitor-list.keys';
import {
  CompetitorAddMutation,
  CompetitorEditMutation,
  CompetitorRowFragment,
  CompetitorsListQuery,
  CompetitorsListQueryVariables,
  useCompetitorAddMutation,
  useCompetitorEditMutation,
} from '@graphql/generated';
import { hashKey, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

interface ManageCompetitorProps {
  competitor?: CompetitorRowFragment;
  listVariables: CompetitorsListQueryVariables;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ManageCompetitor = ({
  competitor,
  listVariables,
  open,
  setOpen,
}: ManageCompetitorProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();

  const handleError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'UnknownError';
    showSnackbar({
      severity: 'error',
      title: t('Utils.Error'),
      description: <>{t(`Error.Server.${errorMessage}`)}</>,
    });
  };

  const { mutate: createCompetitor } = useCompetitorAddMutation(
    portalGraphqlClient,
    {
      onSuccess: async (data: CompetitorAddMutation) => {
        setOpen(false);
        showSnackbar({ severity: 'success', title: t('Utils.Success') });
        const displayedListKey = competitorListKeys.list(listVariables);
        queryClient.setQueryData<CompetitorsListQuery>(
          displayedListKey,
          prependToQueryCache('competitors', { node: data.createCompetitor })
        );
        // Like Relay, only the displayed page shows the new row on top; the other pages and orders refetch.
        await queryClient.invalidateQueries({
          queryKey: competitorListKeys.all(),
          predicate: (query) => query.queryHash !== hashKey(displayedListKey),
        });
      },
      onError: handleError,
    }
  );

  const { mutate: editCompetitor } = useCompetitorEditMutation(
    portalGraphqlClient,
    {
      onSuccess: (data: CompetitorEditMutation) => {
        setOpen(false);
        showSnackbar({ severity: 'success', title: t('Utils.Success') });
        queryClient.setQueriesData<CompetitorsListQuery>(
          { queryKey: competitorListKeys.all() },
          updateInQueryCache('competitors', data.updateCompetitor)
        );
      },
      onError: handleError,
    }
  );

  const handleCreate = (values: z.infer<typeof competitorFormSchema>) => {
    createCompetitor({ input: values });
  };

  const handleUpdate = (values: z.infer<typeof competitorFormSchema>) => {
    editCompetitor({
      input: {
        id: competitor?.id,
        ...values,
      },
    });
  };
  const isCreation = competitor === undefined;
  const title = isCreation
    ? t('CompetitorForm.AddTitle')
    : t('CompetitorForm.EditTitle');

  return (
    <SheetWithPreventingDialog
      title={title}
      setOpen={setOpen}
      open={open}>
      <CompetitorForm
        competitor={competitor}
        onClose={() => setOpen(false)}
        handleSubmit={(values) => {
          isCreation ? handleCreate(values) : handleUpdate(values);
        }}
      />
    </SheetWithPreventingDialog>
  );
};

export default ManageCompetitor;
