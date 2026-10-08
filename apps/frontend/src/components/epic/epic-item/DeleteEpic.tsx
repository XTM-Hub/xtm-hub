import { DeleteEpicMutation } from '@/components/epic/epic.graphql';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { epicDeleteMutation } from '@generated/epicDeleteMutation.graphql';
import { useMutation } from 'react-relay';

interface DeleteEpicProps {
  epic: epic_fragment$data;
  connectionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DeleteEpic = ({
  epic,
  connectionId,
  open,
  setOpen,
}: DeleteEpicProps) => {
  const [deleteEpicMutation] =
    useMutation<epicDeleteMutation>(DeleteEpicMutation);
  const t = useTranslate();
  const onDeletedEpic = (deletedEpicId: string) => {
    deleteEpicMutation({
      variables: { id: deletedEpicId, connections: [connectionId] },
      onCompleted: () => {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('Epic.EpicActions.EpicDeleted'),
        });
      },
      onError: (error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    });
  };
  return (
    <ConfirmDialog
      confirmLabel={t('Utils.Delete')}
      destructive
      title={t('Epic.EpicActions.DeleteEpic', { epicName: epic.title })}
      open={open}
      onOpenChange={setOpen}
      onConfirm={() => onDeletedEpic(epic.id)}>
      {t('Epic.EpicActions.SureDeleteEpic', { epicName: epic.title })}
    </ConfirmDialog>
  );
};
