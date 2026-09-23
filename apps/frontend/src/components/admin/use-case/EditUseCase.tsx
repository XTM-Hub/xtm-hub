import UseCaseForm, {
  UseCaseFormModel,
} from '@/components/admin/use-case/UseCaseForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { removeFromQueryCache, updateInQueryCache } from '@/utils/query-cache';
import { toast } from '@filigran/ui';
import {
  FiligranProduct,
  UseCaseDeleteMutation,
  UseCaseEditMutation,
  UseCasesListQuery,
  useUseCaseDeleteMutation,
  useUseCaseEditMutation,
} from '@graphql/generated';
import { useCaseListKeys } from '@graphql/use-case/use-case-list.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const EditUseCase = ({
  open,
  onClose,
  useCase,
}: {
  open: boolean;
  onClose: () => void;
  useCase: UseCaseFormModel;
}) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [openSheet, setOpenSheet] = useState<boolean>(open);

  const { mutate: editUseCase } = useUseCaseEditMutation(portalGraphqlClient, {
    onSuccess: (data: UseCaseEditMutation) => {
      toast({
        title: t('Utils.Success'),
      });
      queryClient.setQueriesData<UseCasesListQuery>(
        { queryKey: useCaseListKeys.all() },
        updateInQueryCache('useCases', data.editUseCase)
      );
      handleOpenSheet(false);
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'UnknownError';
      toast({
        variant: 'destructive',
        title: t('Utils.Error'),
        description: <>{t(`Error.Server.${errorMessage}`)}</>,
      });
    },
  });

  const { mutate: deleteUseCase } = useUseCaseDeleteMutation(
    portalGraphqlClient,
    {
      onSuccess: (data: UseCaseDeleteMutation) => {
        toast({
          title: t('Utils.Success'),
        });
        queryClient.setQueriesData<UseCasesListQuery>(
          { queryKey: useCaseListKeys.all() },
          removeFromQueryCache('useCases', data.deleteUseCase.id)
        );
        handleOpenSheet(false);
      },
      onError: (error) => {
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

  const handleOpenSheet = (open: boolean) => {
    setOpenSheet((prevState) => {
      const sheetIsClosing = prevState !== open && !open;
      if (sheetIsClosing && onClose) {
        onClose();
      }
      return open;
    });
  };

  const onDeleteUseCase = () => {
    deleteUseCase({
      id: useCase.id,
    });
  };

  const onUpdateUseCase = (input: {
    name: string;
    color: string;
    product: FiligranProduct[];
  }) => {
    editUseCase({
      id: useCase.id,
      input,
    });
  };

  return (
    <SheetWithPreventingDialog
      title={t('UseCaseActions.AddUseCase')}
      setOpen={handleOpenSheet}
      open={openSheet}>
      <UseCaseForm
        key={useCase.id}
        useCase={useCase}
        onClose={() => handleOpenSheet(false)}
        handleDelete={onDeleteUseCase}
        handleSubmit={onUpdateUseCase}
      />
    </SheetWithPreventingDialog>
  );
};

export default EditUseCase;
