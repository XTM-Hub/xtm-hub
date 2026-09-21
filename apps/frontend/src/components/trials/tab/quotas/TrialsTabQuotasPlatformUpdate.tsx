import { TrialsTabQuotasPlatformUpdateForm } from '@/components/trials/tab/quotas/TrialsTabQuotasPlatformUpdateForm';
import { trialsRegionKey } from '@/components/trials/trials.const';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { TrialsQuotaFragment } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';

interface TrialsTabQuotasPlatformUpdateProps {
  quota: TrialsQuotaFragment;
  trigger?: ReactNode;
  onCloseSheet?: () => void;
  defaultStateOpen?: boolean;
}

export const TrialsTabQuotasPlatformUpdate = ({
  trigger,
  onCloseSheet,
  defaultStateOpen,
  quota,
}: TrialsTabQuotasPlatformUpdateProps) => {
  const t = useTranslations();
  const [openSheet, setOpenSheet] = useState(defaultStateOpen ?? false);
  const handleOpenSheet = (open: boolean) => {
    setOpenSheet((prevState) => {
      const sheetIsClosing = prevState !== open && !open;
      if (sheetIsClosing && onCloseSheet) {
        onCloseSheet();
      }
      return open;
    });
  };

  const translatedRegion = t(trialsRegionKey(quota.region));

  return (
    <SheetWithPreventingDialog
      title={t('TrialsDashboard.UpdateQuotasForm.BundleTitle', {
        region: translatedRegion,
      })}
      open={openSheet}
      setOpen={handleOpenSheet}
      trigger={trigger}>
      <TrialsTabQuotasPlatformUpdateForm
        quota={quota}
        callback={() => handleOpenSheet(false)}
      />
    </SheetWithPreventingDialog>
  );
};
