import {
  buildResourceViewEvents,
  type ViewedResource,
} from '@/components/service/document/resource-view-tracker.utils';
import { useAnalyticsEnabled } from '@/hooks/use-analytics-enabled';
import { trackEvent } from '@/lib/analytics/analytics.client';
import { type AnalyticsDeployEligibility } from '@/lib/analytics/analytics.types';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { useEffect, useRef } from 'react';

interface ResourceViewTrackerProps {
  resource: ViewedResource;
  deployEligibility?: AnalyticsDeployEligibility;
}

export const ResourceViewTracker = ({
  resource,
  deployEligibility,
}: ResourceViewTrackerProps) => {
  const isAnalyticsEnabled = useAnalyticsEnabled();
  const trackedResourceId = useRef<string | null>(null);

  useEffect(() => {
    if (!isAnalyticsEnabled) {
      trackedResourceId.current = null;
      return;
    }
    if (
      trackedResourceId.current === resource.id ||
      !isValueInEnum(resource.type, ShareableResourceType)
    ) {
      return;
    }
    trackedResourceId.current = resource.id;
    const { viewItem, useCaseViews } = buildResourceViewEvents(
      resource,
      resource.type,
      deployEligibility
    );
    trackEvent('view_item', viewItem);
    useCaseViews.forEach((params) => trackEvent('view_item_use_case', params));
  }, [isAnalyticsEnabled, resource, deployEligibility]);

  return null;
};
