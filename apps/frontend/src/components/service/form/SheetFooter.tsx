import { useTranslate } from '@/hooks/use-translate';
import { Button, SheetFooter } from '@filigran/ui';

interface ServiceFormSheetFooterProps {
  handleCloseSheet: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ServiceFormSheetFooter = ({
  handleCloseSheet,
}: ServiceFormSheetFooterProps) => {
  const t = useTranslate();
  return (
    <SheetFooter className="sm:justify-between pt-2">
      <div className="ml-auto flex gap-s">
        <Button
          variant="secondary"
          type="button"
          onClick={(e) => handleCloseSheet(e)}>
          {t('Utils.Cancel')}
        </Button>

        <Button>{t('Utils.Validate')}</Button>
      </div>
    </SheetFooter>
  );
};
