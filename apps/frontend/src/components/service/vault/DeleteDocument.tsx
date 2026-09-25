import { DocumentDeleteMutation } from '@/components/service/document/document.graphql';
import { IconActionContext } from '@/components/ui/IconActions';
import { useTranslate } from '@/hooks/use-translate';
import { useToast } from '@filigran/ui';
import { useContext } from 'react';
import { useMutation } from 'react-relay';

import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import useDecodedParams from '@/hooks/use-decoded-params';
import { documentDeleteMutation } from '@generated/documentDeleteMutation.graphql';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
interface DeleteDocumentProps {
  documentData: documentItem_fragment$data;
  connectionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DeleteDocument = ({
  documentData,
  connectionId,
  open,
  setOpen,
}: DeleteDocumentProps) => {
  const t = useTranslate();
  const { toast } = useToast();

  const { setMenuOpen } = useContext(IconActionContext);

  const [vaultDeleteDocumentMutation] = useMutation<documentDeleteMutation>(
    DocumentDeleteMutation
  );
  const { slug } = useDecodedParams();

  const deleteDocument = () => {
    vaultDeleteDocumentMutation({
      variables: {
        documentId: documentData.id,
        serviceInstanceId: slug,
        connections: [connectionId],
      },
      onCompleted: () => {
        toast({
          title: t('Utils.Success'),
          description: t('VaultActions.DocumentDeleted', {
            file_name: documentData.file_name ?? '',
          }),
        });
        setMenuOpen(false);
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };

  return (
    <AlertDialogComponent
      AlertTitle={t('Utils.Delete')}
      actionButtonText={t('Utils.Delete')}
      variantName={'destructive'}
      isOpen={open}
      onOpenChange={setOpen}
      onClickContinue={deleteDocument}>
      {t('Service.Vault.FileForm.DeleteDialog')}
    </AlertDialogComponent>
  );
};

export default DeleteDocument;
