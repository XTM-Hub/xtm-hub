import { type ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { type LogicalMultiSelectSelection } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { FILTER_NAME_LABELS } from '@/lib/analytics/analytics.consts';
import { toAnalyticsLibraryParams } from '@/lib/analytics/analytics.resource';
import { type AnalyticsEvents } from '@/lib/analytics/analytics.types';
import { type ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';

type FilterApplyEvent = AnalyticsEvents['filter_apply'];

export interface AnalyticsFilter {
  filterKey: ServiceListFilterKey;
  resourceType: ShareableResourceType;
  valueLabels?: Readonly<Record<string, string>>;
}

const listAddedValues = (
  from: LogicalMultiSelectSelection,
  to: LogicalMultiSelectSelection
): string[] => Object.keys(to).filter((value) => !Object.hasOwn(from, value));

export const buildFilterApplyEvents = (
  { filterKey, resourceType, valueLabels }: AnalyticsFilter,
  previous: LogicalMultiSelectSelection,
  next: LogicalMultiSelectSelection
): FilterApplyEvent[] => {
  const toEvent =
    (filterAction: FilterApplyEvent['filter_action']) =>
    (value: string): FilterApplyEvent => ({
      ...toAnalyticsLibraryParams(resourceType),
      filter_name: FILTER_NAME_LABELS[filterKey],
      filter_value: valueLabels?.[value] ?? value,
      filter_action: filterAction,
    });
  return [
    ...listAddedValues(previous, next).map(toEvent('Add')),
    ...listAddedValues(next, previous).map(toEvent('Remove')),
  ];
};
