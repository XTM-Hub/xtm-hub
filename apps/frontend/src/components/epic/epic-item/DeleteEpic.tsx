import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { removeFromQueryCache } from '@/utils/query-cache';
import {
  EpicFieldsFragment,
  EpicsQuery,
  useEpicDeleteMutation,
} from '@graphql/generated';
import { epicKeys } from '@graphql/xtm-platform-roadmap/epic.keys';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteEpicProps {
  epic: EpicFieldsFragment;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DeleteEpic = ({ epic, open, setOpen }: DeleteEpicProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { mutate: deleteEpic } = useEpicDeleteMutation(portalGraphqlClient, {
    onSuccess: async (_data, { id }) => {
      showSnackbar({
        severity: 'success',
        title: t('Utils.Success'),
        description: t('Epic.EpicActions.EpicDeleted'),
      });
      // Removes the card at once; the refetch then brings the lists in line with the server.
      queryClient.setQueriesData<EpicsQuery>(
        { queryKey: epicKeys.all() },
        removeFromQueryCache('epics', id)
      );
      await queryClient.invalidateQueries({ queryKey: epicKeys.all() });
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      showSnackbar({
        severity: 'error',
        title: t('Utils.Error'),
        description: <>{t(`Error.Server.${errorMessage}`)}</>,
      });
    },
  });

  return (
    <ConfirmDialog
      confirmLabel={t('Utils.Delete')}
      destructive
      title={t('Epic.EpicActions.DeleteEpic', { epicName: epic.title })}
      open={open}
      onOpenChange={setOpen}
      onConfirm={() => deleteEpic({ id: epic.id })}>
      {t('Epic.EpicActions.SureDeleteEpic', { epicName: epic.title })}
    </ConfirmDialog>
  );
};
