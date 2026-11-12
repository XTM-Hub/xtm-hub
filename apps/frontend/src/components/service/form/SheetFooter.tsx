import { useServiceContext } from '@/components/service/components/ServiceContext';
import { SheetFooter } from '@/components/ui/sheet';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';

interface ServiceFormSheetFooterProps {
  handleCloseSheet: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ServiceFormSheetFooter = ({
  handleCloseSheet,
}: ServiceFormSheetFooterProps) => {
  const t = useTranslate();
  const { isSubmitting } = useServiceContext();
  return (
    <SheetFooter className="sm:justify-between pt-2">
      <div className="ml-auto flex gap-2">
        <Button
          {...analyticsId('resource_form_cancel')}
          priority="secondary"
          type="button"
          onClick={(e) => handleCloseSheet(e)}>
          {t('Utils.Cancel')}
        </Button>

        <Button
          {...analyticsId('resource_form_submit')}
          type="submit"
          loading={isSubmitting}>
          {t('Utils.Validate')}
        </Button>
      </div>
    </SheetFooter>
  );
};
