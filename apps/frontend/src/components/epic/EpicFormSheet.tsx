'use client';
import EpicForm, { epicFormSchema } from '@/components/epic/EpicForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useEpicFilter } from '@/hooks/use-epic-filter';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsEpic } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { updateInQueryCache } from '@/utils/query-cache';
import { Button } from '@filigran/design-system';
import { AddIcon } from '@filigran/icon';
import {
  CreateEpicInput,
  EpicFieldsFragment,
  EpicsQuery,
  UpdateEpicInput,
  useEpicCreateMutation,
  useEpicUpdateMutation,
} from '@graphql/generated';
import { epicKeys } from '@graphql/xtm-platform-roadmap/epic.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

interface EpicFormSheetProps {
  epic?: EpicFieldsFragment;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  triggerElement?: React.ReactNode;
}

type EpicFormValues = z.infer<typeof epicFormSchema>;

// The generated inputs require these keys and the form always fills them, so
// the `null` fallbacks never reach the API. They would not all be harmless:
// on update, a `null` slack_link clears the link.
const toEpicInput = (values: EpicFormValues) => ({
  ...values,
  active: values.active ?? null,
  is_integration: values.is_integration ?? null,
  slack_link: values.slack_link ?? null,
});

const toCreateEpicInput = (values: EpicFormValues): CreateEpicInput =>
  toEpicInput(values);

const toUpdateEpicInput = (values: EpicFormValues): UpdateEpicInput =>
  toEpicInput(values);

export const EpicFormSheet = ({
  epic,
  open: externalOpen,
  setOpen: externalSetOpen,
  triggerElement,
}: EpicFormSheetProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [internalOpenSheet, setInternalOpenSheet] = useState(false);

  const { setSelectedProducts } = useEpicFilter();
  const openSheet =
    externalOpen !== undefined ? externalOpen : internalOpenSheet;
  const setOpenSheet =
    externalSetOpen !== undefined ? externalSetOpen : setInternalOpenSheet;

  const showSuccess = () =>
    showSnackbar({
      severity: 'success',
      title: t('Utils.Success'),
      description: t('Utils.Success'),
    });

  const showError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    showSnackbar({
      severity: 'error',
      title: t('Utils.Error'),
      description: t(`Error.Server.${errorMessage}`),
    });
  };

  const { mutate: commitCreateEpic, isPending: isCreating } =
    useEpicCreateMutation(portalGraphqlClient, {
      onSuccess: async (_data, { input }) => {
        setOpenSheet(false);
        setSelectedProducts(input.products);
        showSuccess();
        await queryClient.invalidateQueries({ queryKey: epicKeys.all() });
      },
      onError: showError,
    });

  const { mutate: commitUpdateEpic, isPending: isUpdating } =
    useEpicUpdateMutation(portalGraphqlClient, {
      onSuccess: async ({ updateEpic }) => {
        setOpenSheet(false);
        showSuccess();
        // Shows the change at once; the refetch then applies the title order and the search.
        queryClient.setQueriesData<EpicsQuery>(
          { queryKey: epicKeys.all() },
          updateInQueryCache('epics', updateEpic)
        );
        await queryClient.invalidateQueries({ queryKey: epicKeys.all() });
      },
      onError: showError,
    });

  const createEpic = (inputValues: EpicFormValues) => {
    commitCreateEpic({ input: toCreateEpicInput(inputValues) });
  };
  const updateEpic = (inputValues: EpicFormValues) => {
    commitUpdateEpic({ id: epic!.id, input: toUpdateEpicInput(inputValues) });
  };
  const handleSubmit = (values: EpicFormValues) => {
    if (!epic) {
      createEpic(values);
    } else {
      updateEpic(values);
    }
  };
  return (
    <SheetWithPreventingDialog
      analyticsContext={epic && analyticsEpic(epic.title)}
      open={openSheet}
      setOpen={setOpenSheet}
      trigger={
        epic ? (
          <></>
        ) : (
          triggerElement || (
            <Button
              {...analyticsId('roadmap_epic_create')}
              priority="tertiary"
              startIcon={<AddIcon className="size-4" />}>
              {t('Utils.Create')}
            </Button>
          )
        )
      }
      title={t(
        epic ? 'Epic.EpicActions.UpdateEpic' : 'Epic.EpicActions.CreateEpic'
      )}>
      <EpicForm
        epic={epic}
        handleSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
      />
    </SheetWithPreventingDialog>
  );
};
