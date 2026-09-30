import { SheetFooter } from '@filigran/ui';
import { useTranslations } from 'next-intl';
import { Button } from '@filigran/design-system';

interface ServiceFormSheetFooterProps {
  handleCloseSheet: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ServiceFormSheetFooter = ({
  handleCloseSheet,
}: ServiceFormSheetFooterProps) => {
  const t = useTranslations();
  return (
    <SheetFooter className="sm:justify-between pt-2">
      <div className="ml-auto flex gap-s">
        <Button
          priority="secondary" type="button" onClick={(e) => handleCloseSheet(e)}>
          {t('Utils.Cancel')}
        </Button>

        <Button>{t('Utils.Validate')}</Button>
      </div>
    </SheetFooter>
  );
};
