'use client';
import { TrialsManageUsersForm } from '@/components/service/trial-instances/manage-users/TrialsManageUsersForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Button } from '@filigran/design-system';

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
  const t = useTranslations();
  const [openSheet, setOpenSheet] = useState(defaultOpen ?? false);

  return (
    <SheetWithPreventingDialog
      title={t('Service.Trials.ManageUsers.Title')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={
        trigger ?? (
          <Button priority="secondary">
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
