import { ServiceListFilterSection } from '@/components/service/components/header/filter/ServiceListFilterSection';
import { ServiceListFilterMap } from '@/components/service/components/header/ServiceListHeader';
import { useTranslate } from '@/hooks/use-translate';
import { IconButton } from '@filigran/design-system';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@filigran/ui/clients';
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
          className="sm:hidden border-elevation-default [-webkit-tap-highlight-color:transparent]"
          aria-label={t('Service.List.Filters')}
          icon={<Funnel className="h-4 w-4" />}
        />
      </SheetTrigger>
      <SheetContent
        side="left"
        closeLabel={t('Utils.Close')}
        aria-describedby={undefined}
        className="bg-gradient-background">
        <SheetHeader className="bg-gradient-background border-elevation-border-strong">
          <SheetTitle>{t('Service.List.Filters')}</SheetTitle>
        </SheetHeader>
        <ServiceListFilterSection filters={filters} />
      </SheetContent>
    </Sheet>
  );
};
