import { ServiceListFilterMap } from '@/components/service/components/header/ServiceListHeader';
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
    return Object.entries(filters).map(([filterKey, filter]) => {
      if (!filter) {
        return null;
      }

      return (
        <Accordion
          key={filterKey}
          type="multiple"
          defaultValue={[]}
          className="w-full border-b border-border last:border-b-0">
          <AccordionItem
            value={filterKey}
            className="border-0">
            <AccordionTrigger className="p-s hover:cursor-pointer">
              {filter.title ?? filterKey}
            </AccordionTrigger>
            <AccordionContent className="pb-s pt-0">
              <div>{filter.node}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    });
  }, [filters]);

  return <div className="flex w-full flex-col">{filtersList}</div>;
};
