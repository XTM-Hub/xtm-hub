import { ClearAllFiltersButton } from '@/components/service/components/header/filter/ClearAllFiltersButton';
import { ServiceListFilterSection } from '@/components/service/components/header/filter/ServiceListFilterSection';
import { useClearAllFilters } from '@/components/service/components/header/filter/use-clear-all-filters';
import { ServiceListFilterMap } from '@/components/service/components/header/ServiceListHeader';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { IconButton } from '@filigran/design-system';
import { Funnel } from 'lucide-react';

interface FilterSheetProps {
  filters: ServiceListFilterMap;
}

export const FilterSheet = ({ filters }: FilterSheetProps) => {
  const t = useTranslate();
  const { headingRef, hasActiveFilters, focusHeading, clearAll } =
    useClearAllFilters();

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
          // Keeps the focus off "Clear all", which is the first tabbable element.
          if (!hasActiveFilters) return;
          event.preventDefault();
          focusHeading();
        }}
        className="bg-gradient-default">
        <SheetHeader className="bg-gradient-default">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle
              ref={headingRef}
              tabIndex={-1}>
              {t('Service.List.Filters')}
            </SheetTitle>
            {hasActiveFilters && <ClearAllFiltersButton onClick={clearAll} />}
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
