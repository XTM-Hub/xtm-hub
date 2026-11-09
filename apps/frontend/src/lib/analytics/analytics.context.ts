import {
  ANALYTICS_EPIC_NAME_ATTRIBUTE,
  ANALYTICS_FEATURE_NAME_ATTRIBUTE,
  ANALYTICS_LIBRARY_ATTRIBUTE,
  ANALYTICS_PRODUCT_ATTRIBUTE,
  ANALYTICS_RESOURCE_ID_ATTRIBUTE,
  ANALYTICS_RESOURCE_NAME_ATTRIBUTE,
  ANALYTICS_SECTION_ATTRIBUTE,
  ANALYTICS_USE_CASES_ATTRIBUTE,
  PRODUCT_LABELS,
} from '@/lib/analytics/analytics.consts';
import { toAnalyticsResourceId } from '@/lib/analytics/analytics.page';
import {
  toAnalyticsLibraryParams,
  toAnalyticsUseCases,
} from '@/lib/analytics/analytics.resource';
import { type ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { type PlatformIdentifier } from '@graphql/generated';

export const analyticsResource = ({
  id,
  name,
  type,
  useCases,
}: {
  id: string;
  name: string;
  type: ShareableResourceType;
  useCases?: ReadonlyArray<{ name: string }> | null;
}) => {
  const { library, product } = toAnalyticsLibraryParams(type);
  return {
    [ANALYTICS_RESOURCE_ID_ATTRIBUTE]: toAnalyticsResourceId(id),
    [ANALYTICS_RESOURCE_NAME_ATTRIBUTE]: name,
    [ANALYTICS_LIBRARY_ATTRIBUTE]: library,
    [ANALYTICS_USE_CASES_ATTRIBUTE]: toAnalyticsUseCases(useCases),
    [ANALYTICS_PRODUCT_ATTRIBUTE]: product,
  };
};

export const analyticsSection = (section: string) => ({
  [ANALYTICS_SECTION_ATTRIBUTE]: section,
});

export const analyticsEpic = (name: string) => ({
  [ANALYTICS_EPIC_NAME_ATTRIBUTE]: name,
});

export const analyticsFeature = (name: string) => ({
  [ANALYTICS_FEATURE_NAME_ATTRIBUTE]: name,
});

export const analyticsProduct = (product: PlatformIdentifier) => ({
  [ANALYTICS_PRODUCT_ATTRIBUTE]: PRODUCT_LABELS[product],
});
