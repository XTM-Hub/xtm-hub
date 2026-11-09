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
import {
  Icon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { ReactNode, useMemo } from 'react';

interface ServiceListFilterSectionProps {
  filters: ServiceListFilterMap;
}

interface FilterTitleProps {
  title: ReactNode;
  tooltip?: string;
}

const FilterTitle = ({ title, tooltip }: FilterTitleProps) => (
  <span className="flex items-center gap-1">
    {title}
    {tooltip && (
      <>
        <Icon
          name="info"
          size={16}
          className="shrink-0 text-default-secondary"
        />
        <span className="sr-only">{tooltip}</span>
      </>
    )}
  </span>
);

interface FilterTooltipProps {
  tooltip?: string;
  children: ReactNode;
}

const FilterTooltip = ({ tooltip, children }: FilterTooltipProps) => {
  if (!tooltip) {
    return children;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{children}</div>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

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
              <FilterTooltip tooltip={filter.tooltip}>
                <div className="content-compact-medium pb-1">
                  <FilterTitle
                    title={filter.title}
                    tooltip={filter.tooltip}
                  />
                </div>
              </FilterTooltip>
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
            <FilterTooltip tooltip={filter.tooltip}>
              <AccordionTrigger
                {...analyticsId('resource_filter_section_toggle')}
                className="p-2 hover:cursor-pointer content-compact-medium">
                <FilterTitle
                  title={filter.title ?? filterKey}
                  tooltip={filter.tooltip}
                />
              </AccordionTrigger>
            </FilterTooltip>
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
