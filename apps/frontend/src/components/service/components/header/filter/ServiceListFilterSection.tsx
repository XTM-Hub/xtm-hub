import {
  ServiceListFilter,
  ServiceListFilterMap,
} from '@/components/service/components/header/ServiceListHeader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@filigran/ui';
import { useMemo } from 'react';

interface ServiceListFilterSectionProps {
  filters: ServiceListFilterMap;
}

export const ServiceListFilterSection = ({
  filters,
}: ServiceListFilterSectionProps) => {
  const filtersList = useMemo(() => {
    const visibleFilters = Object.entries(filters).filter(
      (entry): entry is [string, ServiceListFilter] => Boolean(entry[1])
    );

    return visibleFilters.map(([filterKey, filter], index) => {
      return (
        <Accordion
          key={filterKey}
          type="multiple"
          defaultValue={index === 0 ? [filterKey] : []}
          className="w-full border-b border-border last:border-b-0">
          <AccordionItem
            value={filterKey}
            className="border-0">
            <AccordionTrigger className="p-s hover:cursor-pointer content-body-compact-medium">
              {filter.title ?? filterKey}
            </AccordionTrigger>
            {/* pr-s matches the trigger's 8px right padding so each count
                badge lines up with the accordion chevron above it. */}
            <AccordionContent className="pb-s pt-0 pr-s">
              <div>{filter.node}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    });
  }, [filters]);

  return <div className="flex w-full flex-col">{filtersList}</div>;
};
