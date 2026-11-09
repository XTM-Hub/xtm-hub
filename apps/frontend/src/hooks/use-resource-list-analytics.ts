import { useAnalyticsEnabled } from '@/hooks/use-analytics-enabled';
import { trackEvent } from '@/lib/analytics/analytics.client';
import {
  type ResourceListResults,
  type ResourceListSnapshot,
  resolveResourceListEvents,
} from '@/lib/analytics/analytics.list';
import { type ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { type documentsQuery$variables } from '@generated/documentsQuery.graphql';
import { useEffect, useRef } from 'react';

interface UseResourceListAnalyticsParams extends ResourceListResults {
  resourceType: ShareableResourceType;
  variables: Pick<documentsQuery$variables, 'searchTerm' | 'logicalFilters'>;
}

export const useResourceListAnalytics = ({
  resourceType,
  variables,
  totalCount,
  resources,
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
    resourceType,
    searchTerm,
    filters,
    totalCount,
    resources,
  ]);
};
