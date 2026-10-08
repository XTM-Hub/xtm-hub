'use client';

import {
  CompetitorAddMutation,
  CompetitorEditMutation,
} from '@/components/competitor/competitor.graphql';
import CompetitorForm, {
  competitorFormSchema,
} from '@/components/competitor/CompetitorForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { competitor_fragment$data } from '@generated/competitor_fragment.graphql';
import { useMutation } from 'react-relay';
import { z } from 'zod';

interface ManageCompetitorProps {
  competitor?: competitor_fragment$data;
  connectionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ManageCompetitor = ({
  competitor,
  connectionId,
  open,
  setOpen,
}: ManageCompetitorProps) => {
  const t = useTranslate();
  const [createCompetitor] = useMutation(CompetitorAddMutation);
  const [editCompetitor] = useMutation(CompetitorEditMutation);

  const handleCreate = (values: z.infer<typeof competitorFormSchema>) => {
    createCompetitor({
      variables: {
        input: values,
        connections: [connectionId],
      },
      onCompleted: () => {
        setOpen(false);
        showSnackbar({ severity: 'success', title: t('Utils.Success') });
      },
      onError: (error: Error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    });
  };

  const handleUpdate = (values: z.infer<typeof competitorFormSchema>) => {
    editCompetitor({
      variables: {
        input: {
          id: competitor?.id,
          ...values,
        },
      },
      onCompleted: () => {
        setOpen(false);
        showSnackbar({ severity: 'success', title: t('Utils.Success') });
      },
      onError: (error: Error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    });
  };
  const isCreation = competitor === undefined;
  const title = isCreation
    ? t('CompetitorForm.AddTitle')
    : t('CompetitorForm.EditTitle');

  return (
    <SheetWithPreventingDialog
      title={title}
      setOpen={setOpen}
      open={open}>
      <CompetitorForm
        competitor={competitor}
        onClose={() => setOpen(false)}
        handleSubmit={(values) => {
          isCreation ? handleCreate(values) : handleUpdate(values);
        }}
      />
    </SheetWithPreventingDialog>
  );
};

export default ManageCompetitor;
