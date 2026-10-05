import UseCaseForm from '@/components/admin/use-case/UseCaseForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { prependToQueryCache } from '@/utils/query-cache';
import { Button, toast } from '@filigran/ui';
import {
  UseCaseAddMutation,
  UseCasesListQuery,
  useUseCaseAddMutation,
} from '@graphql/generated';
import { useCaseListKeys } from '@graphql/use-case/use-case-list.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const AddUseCase = () => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);
  const queryClient = useQueryClient();
  const { mutate: createUseCase } = useUseCaseAddMutation(portalGraphqlClient, {
    onSuccess: (data: UseCaseAddMutation) => {
      setOpenSheet(false);
      const newUseCase = data.addUseCase;
      if (newUseCase) {
        queryClient.setQueriesData<UseCasesListQuery>(
          { queryKey: useCaseListKeys.all() },
          prependToQueryCache('useCases', { node: newUseCase })
        );
      }
      toast({
        title: t('Utils.Success'),
      });
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
  });

  return (
    <SheetWithPreventingDialog
      title={t('UseCaseActions.AddUseCase')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={<Button>{t('UseCaseActions.AddUseCase')}</Button>}>
      <UseCaseForm
        onClose={() => setOpenSheet(false)}
        handleSubmit={(input) => createUseCase({ input })}
      />
    </SheetWithPreventingDialog>
  );
};

export default AddUseCase;
