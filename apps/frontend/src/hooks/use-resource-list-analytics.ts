import { useAnalyticsEnabled } from '@/hooks/use-analytics-enabled';
import { trackEvent } from '@/lib/analytics/analytics.client';
import {
  type ResourceListResults,
  type ResourceListSnapshot,
  resolveResourceListEvents,
} from '@/lib/analytics/analytics.list';
import { type ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { type DocumentsListQueryVariables } from '@graphql/generated';
import { useEffect, useRef } from 'react';

interface UseResourceListAnalyticsParams extends ResourceListResults {
  resourceType: ShareableResourceType;
  variables: Pick<DocumentsListQueryVariables, 'searchTerm' | 'logicalFilters'>;
  /** False while the results are not the ones of the current search and filters (loading, stale placeholder). */
  enabled?: boolean;
}

export const useResourceListAnalytics = ({
  resourceType,
  variables,
  totalCount,
  resources,
  enabled = true,
}: UseResourceListAnalyticsParams) => {
  const isAnalyticsEnabled = useAnalyticsEnabled();
  const previousSnapshot = useRef<ResourceListSnapshot | null>(null);
  const searchTerm = (variables.searchTerm ?? '').trim();
  const filters = JSON.stringify(variables.logicalFilters);

  useEffect(() => {
    if (!isAnalyticsEnabled) {
      previousSnapshot.current = null;
      return;
    }
    if (!enabled) {
      return;
    }
    const snapshot = { resourceType, searchTerm, filters };
    const { viewItemList, search } = resolveResourceListEvents(
      previousSnapshot.current,
      snapshot,
      { totalCount, resources }
    );
    previousSnapshot.current = snapshot;
    if (viewItemList) {
      trackEvent('view_item_list', viewItemList);
    }
    if (search) {
      trackEvent('search', search);
    }
  }, [
    isAnalyticsEnabled,
    enabled,
    resourceType,
    searchTerm,
    filters,
    totalCount,
    resources,
  ]);
};
