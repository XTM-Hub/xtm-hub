'use client';

import { useTranslate } from '@/hooks/use-translate';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@filigran/ui';
import { PlatformIdentifier } from '@graphql/generated';
import { ReactNode } from 'react';
import { AddTrialUserForm } from './AddTrialUserForm';
import { EditTrialUsersForm } from './EditTrialUsersForm';

interface TrialUserDialogSharedProps {
  serviceInstanceId: string;
  products: PlatformIdentifier[];
  open: boolean;
  setOpen: (open: boolean) => void;
}

type TrialUserDialogProps =
  | (TrialUserDialogSharedProps & { mode: 'add' })
  | (TrialUserDialogSharedProps & { mode: 'edit'; initialUserIds: string[] });

export const TrialUserDialog = (props: TrialUserDialogProps) => {
  const { mode, serviceInstanceId, products, open, setOpen } = props;
  const t = useTranslate();
  const onClose = () => setOpen(false);

  let form: ReactNode;
  if (mode === 'add') {
    form = (
      <AddTrialUserForm
        serviceInstanceId={serviceInstanceId}
        products={products}
        onCompleted={onClose}
        onCancel={onClose}
      />
    );
  } else {
    const { initialUserIds } = props;
    form = (
      <EditTrialUsersForm
        serviceInstanceId={serviceInstanceId}
        products={products}
        initialUserIds={initialUserIds}
        onCompleted={onClose}
        onCancel={onClose}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add'
              ? t('Service.Bundle.ManageTrial.AddUserDialog.Title')
              : t('Service.Bundle.ManageTrial.EditUsersDialog.Title')}
          </DialogTitle>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};
