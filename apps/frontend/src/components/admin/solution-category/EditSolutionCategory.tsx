import SolutionCategoryForm, {
  SolutionCategoryFormModel,
  solutionCategoryFormSchema,
} from '@/components/admin/solution-category/SolutionCategoryForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { removeFromQueryCache, updateInQueryCache } from '@/utils/query-cache';
import { toast } from '@filigran/ui';
import {
  SolutionCategoriesListQuery,
  SolutionCategoryDeleteMutation,
  SolutionCategoryEditMutation,
  useSolutionCategoryDeleteMutation,
  useSolutionCategoryEditMutation,
} from '@graphql/generated';
import { solutionCategoryListKeys } from '@graphql/solution-category/solution-category-list.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

const EditSolutionCategory = ({
  open,
  onClose,
  solutionCategory,
}: {
  open: boolean;
  onClose: () => void;
  solutionCategory: SolutionCategoryFormModel;
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

  const { mutate: editSolutionCategory } = useSolutionCategoryEditMutation(
    portalGraphqlClient,
    {
      onSuccess: (data: SolutionCategoryEditMutation) => {
        toast({
          title: t('Utils.Success'),
        });
        queryClient.setQueriesData<SolutionCategoriesListQuery>(
          { queryKey: solutionCategoryListKeys.all() },
          updateInQueryCache('solutionCategories', data.editSolutionCategory)
        );
        handleOpenSheet(false);
      },
      onError: handleError,
    }
  );

  const { mutate: deleteSolutionCategory } = useSolutionCategoryDeleteMutation(
    portalGraphqlClient,
    {
      onSuccess: (data: SolutionCategoryDeleteMutation) => {
        toast({
          title: t('Utils.Success'),
        });
        queryClient.setQueriesData<SolutionCategoriesListQuery>(
          { queryKey: solutionCategoryListKeys.all() },
          removeFromQueryCache(
            'solutionCategories',
            data.deleteSolutionCategory.id
          )
        );
        handleOpenSheet(false);
      },
      onError: handleError,
    }
  );

  const handleOpenSheet = (openValue: boolean) => {
    setOpenSheet((previousState) => {
      const sheetIsClosing = previousState !== openValue && !openValue;
      if (sheetIsClosing) {
        onClose();
      }
      return openValue;
    });
  };

  const onUpdate = (input: z.infer<typeof solutionCategoryFormSchema>) => {
    editSolutionCategory({
      id: solutionCategory.id,
      input,
    });
  };

  const onDelete = () => {
    deleteSolutionCategory({
      id: solutionCategory.id,
    });
  };

  return (
    <SheetWithPreventingDialog
      title={t('SolutionCategory.Actions.Add')}
      setOpen={handleOpenSheet}
      open={openSheet}>
      <SolutionCategoryForm
        key={solutionCategory.id}
        solutionCategory={solutionCategory}
        onClose={() => handleOpenSheet(false)}
        handleDelete={onDelete}
        handleSubmit={onUpdate}
      />
    </SheetWithPreventingDialog>
  );
};

export default EditSolutionCategory;
