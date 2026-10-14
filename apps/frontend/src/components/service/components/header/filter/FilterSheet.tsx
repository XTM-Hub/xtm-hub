import { ServiceListFilterSection } from '@/components/service/components/header/filter/ServiceListFilterSection';
import { ServiceListFilterMap } from '@/components/service/components/header/ServiceListHeader';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslate } from '@/hooks/use-translate';
import { IconButton } from '@filigran/design-system';
import { Funnel } from 'lucide-react';

interface FilterSheetProps {
  filters: ServiceListFilterMap;
}

export const FilterSheet = ({ filters }: FilterSheetProps) => {
  const t = useTranslate();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <IconButton
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
        className="bg-gradient-background">
        <SheetHeader className="bg-gradient-background">
          <SheetTitle>{t('Service.List.Filters')}</SheetTitle>
        </SheetHeader>
        <ServiceListFilterSection filters={filters} />
      </SheetContent>
    </Sheet>
  );
};
