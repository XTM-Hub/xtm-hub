'use client';
import { TrialsManageUsersForm } from '@/components/service/trial-instances/manage-users/TrialsManageUsersForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/ui';
import React, { useState } from 'react';

interface TrialsManageUsersDialogProps {
  serviceInstanceId: string;
  organizationId?: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export const TrialsManageUsersDialog = ({
  serviceInstanceId,
  organizationId,
  trigger,
  defaultOpen,
}: TrialsManageUsersDialogProps) => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(defaultOpen ?? false);

  return (
    <SheetWithPreventingDialog
      title={t('Service.Trials.ManageUsers.Title')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={
        trigger ?? (
          <Button variant="secondary">
            {t('Service.Trials.ManageUsers.Title')}
          </Button>
        )
      }>
      {serviceInstanceId && (
        <TrialsManageUsersForm
          key={serviceInstanceId}
          onCancel={() => setOpenSheet(false)}
          onCompleted={() => setOpenSheet(false)}
          organizationId={organizationId}
          serviceInstanceId={serviceInstanceId}
        />
      )}
    </SheetWithPreventingDialog>
  );
};
