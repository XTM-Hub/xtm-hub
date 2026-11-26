import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';

interface ClearAllFiltersButtonProps {
  onClick: () => void;
}

export const ClearAllFiltersButton = ({
  onClick,
}: ClearAllFiltersButtonProps) => {
  const t = useTranslate();

  return (
    <Button
      {...analyticsId('resource_filters_remove')}
      priority="tertiary"
      size="sm"
      onClick={onClick}>
      {t('Service.List.ClearAllFilters')}
    </Button>
  );
};
