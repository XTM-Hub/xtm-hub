import { ClearAllFiltersButton } from '@/components/service/components/header/filter/ClearAllFiltersButton';
import { ServiceListFilterSection } from '@/components/service/components/header/filter/ServiceListFilterSection';
import { ServiceListFilterMap } from '@/components/service/components/header/ServiceListHeader';
import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { IconButton } from '@filigran/design-system';
import { Funnel } from 'lucide-react';
import { useRef } from 'react';

interface FilterSheetProps {
  filters: ServiceListFilterMap;
}

export const FilterSheet = ({ filters }: FilterSheetProps) => {
  const t = useTranslate();
  const { storageKey } = useServiceListStorageKeyContext();
  const { hasActiveFilters, clearFilters } = useServiceListStorage(storageKey);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Keeps the focus off "Clear all", which is the first tabbable element.
  const focusTitle = () => titleRef.current?.focus();

  const handleClearAll = () => {
    clearFilters();
    focusTitle();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <IconButton
          {...analyticsId('resource_filters_open')}
          priority="secondary"
          className="sm:hidden [-webkit-tap-highlight-color:transparent]"
          aria-label={t('Service.List.Filters')}
          icon={<Funnel className="h-4 w-4" />}
        />
      </SheetTrigger>
      <SheetContent
        side="left"
        closeLabel={t('Utils.Close')}
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          if (!hasActiveFilters) return;
          event.preventDefault();
          focusTitle();
        }}
        className="bg-gradient-default">
        <SheetHeader className="bg-gradient-default">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle
              ref={titleRef}
              tabIndex={-1}>
              {t('Service.List.Filters')}
            </SheetTitle>
            {hasActiveFilters && (
              <ClearAllFiltersButton onClick={handleClearAll} />
            )}
          </div>
        </SheetHeader>
        <ServiceListFilterSection
          filters={filters}
          descriptionDisplay="text"
        />
      </SheetContent>
    </Sheet>
  );
};
