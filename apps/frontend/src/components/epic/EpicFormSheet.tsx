'use client';
import {
  CreateEpicMutation,
  UpdateEpicMutation,
} from '@/components/epic/epic.graphql';
import EpicForm, { epicFormSchema } from '@/components/epic/EpicForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useEpicFilter } from '@/hooks/use-epic-filter';
import { useEpicListContext } from '@/hooks/use-epic-list-context';
import { fileListToUploadableMap } from '@/relay/environment/fetch-form-data';
import { AddIcon } from '@filigran/icon';
import { Button, useToast } from '@filigran/ui';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMutation } from 'react-relay';
import { UploadableMap } from 'relay-runtime';
import { z } from 'zod';

interface EpicFormSheetProps {
  epic?: epic_fragment$data;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  triggerElement?: React.ReactNode;
}

export const EpicFormSheet = ({
  epic,
  open: externalOpen,
  setOpen: externalSetOpen,
  triggerElement,
}: EpicFormSheetProps) => {
  const t = useTranslations();
  const [internalOpenSheet, setInternalOpenSheet] = useState(false);

  const [commitEpicMutation] = useMutation(CreateEpicMutation);
  const [updateEpicMutation] = useMutation(UpdateEpicMutation);
  const { toast } = useToast();
  const { connectionID } = useEpicListContext();
  const { setSelectedProducts } = useEpicFilter();
  const openSheet =
    externalOpen !== undefined ? externalOpen : internalOpenSheet;
  const setOpenSheet =
    externalSetOpen !== undefined ? externalSetOpen : setInternalOpenSheet;

  const createEpic = (
    inputValues: z.infer<typeof epicFormSchema>,
    uploadables: UploadableMap | undefined,
    document: File[] | undefined
  ) => {
    commitEpicMutation({
      variables: {
        input: { ...inputValues },
        connections: [connectionID],
        document,
      },
      uploadables,
      onCompleted: () => {
        setOpenSheet(false);
        setSelectedProducts(inputValues.products);
        toast({
          title: t('Utils.Success'),
          description: t('Utils.Success'),
        });
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
  const updateEpic = (
    inputValues: z.infer<typeof epicFormSchema>,
    uploadables: UploadableMap | undefined,
    document: File[] | undefined
  ) => {
    updateEpicMutation({
      variables: {
        id: epic!.id,
        input: { ...inputValues },
        document,
      },
      uploadables,
      onCompleted: () => {
        setOpenSheet(false);
        toast({
          title: t('Utils.Success'),
          description: t('Utils.Success'),
        });
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
  const handleSubmit = (values: z.infer<typeof epicFormSchema>) => {
    const document = !values.illustration_document
      ? undefined
      : Array.from(values.illustration_document);
    const uploadables = !document
      ? undefined
      : fileListToUploadableMap(document);

    const { illustration_document: _illustration, ...inputValues } = values;

    if (!epic) {
      createEpic(inputValues, uploadables, document);
    } else {
      updateEpic(inputValues, uploadables, document);
    }
  };
  return (
    <SheetWithPreventingDialog
      open={openSheet}
      setOpen={setOpenSheet}
      trigger={
        epic ? (
          <></>
        ) : (
          triggerElement || (
            <Button variant="tertiary">
              <AddIcon className="size-4 mr-s" />
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
      />
    </SheetWithPreventingDialog>
  );
};
