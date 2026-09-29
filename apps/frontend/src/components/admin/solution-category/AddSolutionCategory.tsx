import SolutionCategoryForm, {
  solutionCategoryFormSchema,
} from '@/components/admin/solution-category/SolutionCategoryForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { prependToQueryCache } from '@/utils/query-cache';
import { Button, toast } from '@filigran/ui';
import {
  SolutionCategoriesListQuery,
  SolutionCategoryAddMutation,
  useSolutionCategoryAddMutation,
} from '@graphql/generated';
import { solutionCategoryListKeys } from '@graphql/solution-category/solution-category-list.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

const AddSolutionCategory = () => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: addSolutionCategory } = useSolutionCategoryAddMutation(
    portalGraphqlClient,
    {
      onSuccess: (data: SolutionCategoryAddMutation) => {
        setOpenSheet(false);
        const newSolutionCategory = data.addSolutionCategory;
        if (newSolutionCategory) {
          queryClient.setQueriesData<SolutionCategoriesListQuery>(
            { queryKey: solutionCategoryListKeys.all() },
            prependToQueryCache('solutionCategories', {
              node: newSolutionCategory,
            })
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
    }
  );

  const onSubmit = (input: z.infer<typeof solutionCategoryFormSchema>) => {
    addSolutionCategory({ input });
  };

  return (
    <SheetWithPreventingDialog
      title={t('SolutionCategory.Actions.Add')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={<Button>{t('SolutionCategory.Actions.Add')}</Button>}>
      <SolutionCategoryForm
        onClose={() => setOpenSheet(false)}
        handleSubmit={onSubmit}
      />
    </SheetWithPreventingDialog>
  );
};

export default AddSolutionCategory;
