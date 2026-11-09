import { toAnalyticsResourceId } from '@/lib/analytics/analytics.page';
import {
  toAnalyticsItem,
  toAnalyticsLibraryParams,
  toAnalyticsUseCaseNames,
  toAnalyticsUseCases,
} from '@/lib/analytics/analytics.resource';
import {
  type AnalyticsDeployEligibility,
  type AnalyticsEvents,
  type AnalyticsResource,
} from '@/lib/analytics/analytics.types';
import { type ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';

export interface ViewedResource extends AnalyticsResource {
  type: string;
  use_cases: ReadonlyArray<{ name: string }> | null | undefined;
}

interface ResourceViewEvents {
  viewItem: AnalyticsEvents['view_item'];
  useCaseViews: AnalyticsEvents['view_item_use_case'][];
}

export const buildResourceViewEvents = (
  resource: ViewedResource,
  resourceType: ShareableResourceType,
  deployEligibility: AnalyticsDeployEligibility | undefined
): ResourceViewEvents => {
  const resourceParams = {
    resource_id: toAnalyticsResourceId(resource.id),
    resource_name: resource.name ?? '',
    ...toAnalyticsLibraryParams(resourceType),
  };
  return {
    viewItem: {
      ...resourceParams,
      items: [toAnalyticsItem(resource, resourceType, 0)],
      use_cases: toAnalyticsUseCases(resource.use_cases),
      deploy_eligibility: deployEligibility,
    },
    useCaseViews: toAnalyticsUseCaseNames(resource.use_cases).map(
      (use_case) => ({ ...resourceParams, use_case })
    ),
  };
};
