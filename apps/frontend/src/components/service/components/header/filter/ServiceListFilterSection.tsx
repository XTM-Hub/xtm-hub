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
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import {
  Icon,
  IconButton,
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { useMemo } from 'react';

type FilterDescriptionDisplay = 'tooltip' | 'text';

interface ServiceListFilterSectionProps {
  filters: ServiceListFilterMap;
  descriptionDisplay?: FilterDescriptionDisplay;
}

interface FilterDescriptionProps {
  description: string;
}

const FilterInfoButton = ({ description }: FilterDescriptionProps) => {
  const t = useTranslate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* eslint-disable-next-line no-restricted-syntax -- only opens a tooltip, not an action worth tracking */}
          <IconButton
            size="sm"
            priority="tertiary"
            aria-label={t('Service.List.FilterInformation')}
            icon={
              <Icon
                name="info"
                size={16}
              />
            }
          />
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const FilterDescriptionText = ({ description }: FilterDescriptionProps) => (
  <Text
    as="p"
    variant="content-compact"
    className="pb-1 text-default-secondary">
    {description}
  </Text>
);

export const ServiceListFilterSection = ({
  filters,
  descriptionDisplay = 'tooltip',
}: ServiceListFilterSectionProps) => {
  const filtersList = useMemo(() => {
    const visibleFilters = Object.entries(filters).filter(
      (entry): entry is [string, ServiceListFilter] => Boolean(entry[1])
    );

    return visibleFilters.map(([filterKey, filter], index) => {
      const infoButton = descriptionDisplay === 'tooltip' &&
        filter.description && (
          <FilterInfoButton description={filter.description} />
        );
      const descriptionText = descriptionDisplay === 'text' &&
        filter.description && (
          <FilterDescriptionText description={filter.description} />
        );

      if (filter.noAccordion) {
        return (
          <div
            key={filterKey}
            className="w-full border-b border-elevation-subtle p-2 last:border-b-0">
            {filter.title && (
              <div
                className={cn(
                  'content-compact-medium pb-1',
                  infoButton && 'flex items-center gap-1'
                )}>
                {filter.title}
                {infoButton}
              </div>
            )}
            {descriptionText}
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
            {/* The info button sits outside the trigger, over its row: right-6 clears the trigger's pr-2 and 16px chevron. */}
            <div className="relative">
              <AccordionTrigger
                {...analyticsId('resource_filter_section_toggle')}
                className="p-2 hover:cursor-pointer content-compact-medium">
                {filter.title ?? filterKey}
              </AccordionTrigger>
              {infoButton && (
                <div className="absolute right-6 top-1/2 flex -translate-y-1/2">
                  {infoButton}
                </div>
              )}
            </div>
            {/* pr-2 matches the trigger's 8px right padding so each count
                badge lines up with the accordion chevron above it. */}
            <AccordionContent className="pb-2 pt-0 pr-2">
              {descriptionText}
              <div>{filter.node}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    });
  }, [filters, descriptionDisplay]);

  return <div className="flex w-full flex-col">{filtersList}</div>;
};
