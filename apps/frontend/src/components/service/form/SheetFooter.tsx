import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { SheetFooter } from '@filigran/ui';

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
          priority="secondary"
          type="button"
          onClick={(e) => handleCloseSheet(e)}>
          {t('Utils.Cancel')}
        </Button>

        <Button type="submit">{t('Utils.Validate')}</Button>
      </div>
    </SheetFooter>
  );
};
