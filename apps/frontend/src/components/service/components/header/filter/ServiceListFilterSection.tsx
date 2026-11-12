import {
  ServiceListFilter,
  ServiceListFilterMap,
} from '@/components/service/components/header/ServiceListHeader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { analyticsId } from '@/lib/analytics/analytics.ids';
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
      if (filter.noAccordion) {
        return (
          <div
            key={filterKey}
            className="w-full border-b border-elevation-subtle p-2 last:border-b-0">
            {filter.title && (
              <div className="content-compact-medium pb-1">{filter.title}</div>
            )}
            {filter.node}
          </div>
        );
      }

      return (
        <Accordion
          key={filterKey}
          type="multiple"
          defaultValue={index === 0 ? [filterKey] : []}
          className="w-full border-b border-elevation-subtle last:border-b-0">
          <AccordionItem
            value={filterKey}
            className="border-0">
            <AccordionTrigger
              {...analyticsId('resource_filter_section_toggle')}
              className="p-2 hover:cursor-pointer content-compact-medium">
              {filter.title ?? filterKey}
            </AccordionTrigger>
            {/* pr-2 matches the trigger's 8px right padding so each count
                badge lines up with the accordion chevron above it. */}
            <AccordionContent className="pb-2 pt-0 pr-2">
              <div>{filter.node}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    });
  }, [filters]);

  return <div className="flex w-full flex-col">{filtersList}</div>;
};
