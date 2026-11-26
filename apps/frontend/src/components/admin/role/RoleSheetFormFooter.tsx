import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  type AnalyticsElementId,
  analyticsId,
} from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';
import { useEffect } from 'react';

const RoleSheetFormFooter = ({
  isDirty,
  submitAnalyticsId,
}: {
  isDirty: boolean;
  submitAnalyticsId: AnalyticsElementId;
}) => {
  const t = useTranslate();
  const { handleCloseSheet, setIsDirty } = useDialogContext();

  // The sheet unmounts its content on close: the cleanup resets the dirty
  // state so the next opening does not inherit the previous draft's.
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);

  return (
    <SheetFooter className="pt-2">
      <div className="flex gap-2">
        <Button
          type="button"
          priority="secondary"
          {...analyticsId('admin_form_cancel')}
          onClick={(e) => handleCloseSheet(e)}>
          {t('Utils.Cancel')}
        </Button>
        <Button
          {...analyticsId(submitAnalyticsId)}
          type="submit">
          {t('Utils.Validate')}
        </Button>
      </div>
    </SheetFooter>
  );
};

export default RoleSheetFormFooter;
