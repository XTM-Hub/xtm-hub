import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { SheetFooter } from '@filigran/ui';
import { useEffect } from 'react';

const RoleSheetFormFooter = ({ isDirty }: { isDirty: boolean }) => {
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
      <div className="flex gap-s">
        <Button
          type="button"
          priority="secondary"
          onClick={(e) => handleCloseSheet(e)}>
          {t('Utils.Cancel')}
        </Button>
        <Button type="submit">{t('Utils.Validate')}</Button>
      </div>
    </SheetFooter>
  );
};

export default RoleSheetFormFooter;
