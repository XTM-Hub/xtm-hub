import { MIN_TRACKED_SEARCH_TERM_LENGTH } from '@/lib/analytics/analytics.consts';
import {
  toAnalyticsItem,
  toAnalyticsLibraryParams,
} from '@/lib/analytics/analytics.resource';
import { maskSearchTerm } from '@/lib/analytics/analytics.search-term';
import {
  type AnalyticsEvents,
  type AnalyticsListResults,
  type AnalyticsResource,
} from '@/lib/analytics/analytics.types';
import { type ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';

export interface ResourceListSnapshot {
  resourceType: ShareableResourceType;
  searchTerm: string;
  filters: string;
}

export interface ResourceListResults {
  totalCount: number;
  resources: readonly AnalyticsResource[];
}

interface ResourceListEvents {
  viewItemList?: AnalyticsEvents['view_item_list'];
  search?: AnalyticsEvents['search'];
}

const isSameList = (
  previous: ResourceListSnapshot,
  current: ResourceListSnapshot
): boolean =>
  previous.resourceType === current.resourceType &&
  previous.searchTerm === current.searchTerm &&
  previous.filters === current.filters;

export const resolveResourceListEvents = (
  previous: ResourceListSnapshot | null,
  current: ResourceListSnapshot,
  { totalCount, resources }: ResourceListResults
): ResourceListEvents => {
  if (previous && isSameList(previous, current)) {
    return {};
  }
  const libraryParams = toAnalyticsLibraryParams(current.resourceType);
  const listResults: AnalyticsListResults = {
    ...libraryParams,
    result_count: totalCount,
    has_results: totalCount > 0 ? 'Yes' : 'No',
  };
  const viewItemList = {
    ...listResults,
    item_list_name: libraryParams.library,
    items: resources.map((resource, index) =>
      toAnalyticsItem(resource, current.resourceType, index)
    ),
  };
  const isNewSearch =
    previous !== null &&
    previous.resourceType === current.resourceType &&
    previous.searchTerm !== current.searchTerm &&
    current.searchTerm.length >= MIN_TRACKED_SEARCH_TERM_LENGTH;
  return isNewSearch
    ? {
        viewItemList,
        search: {
          ...listResults,
          search_term: maskSearchTerm(current.searchTerm),
        },
      }
    : { viewItemList };
};
