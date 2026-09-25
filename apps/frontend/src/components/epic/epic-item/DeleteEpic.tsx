import { DeleteEpicMutation } from '@/components/epic/epic.graphql';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import { useToast } from '@filigran/ui';
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
  const { toast } = useToast();
  const onDeletedEpic = (deletedEpicId: string) => {
    deleteEpicMutation({
      variables: { id: deletedEpicId, connections: [connectionId] },
      onCompleted: () => {
        toast({
          title: t('Utils.Success'),
          description: t('Epic.EpicActions.EpicDeleted'),
        });
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    });
  };
  return (
    <AlertDialogComponent
      actionButtonText={t('Utils.Delete')}
      variantName={'destructive'}
      AlertTitle={t('Epic.EpicActions.DeleteEpic', { epicName: epic.title })}
      isOpen={open}
      onOpenChange={setOpen}
      onClickContinue={() => onDeletedEpic(epic.id)}>
      {t('Epic.EpicActions.SureDeleteEpic', { epicName: epic.title })}
    </AlertDialogComponent>
  );
};
