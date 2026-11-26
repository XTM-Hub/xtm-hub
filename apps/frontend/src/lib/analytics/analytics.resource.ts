import { toAnalyticsResourceId } from '@/lib/analytics/analytics.page';
import {
  type AnalyticsItem,
  type AnalyticsLibraryParams,
  type AnalyticsResource,
} from '@/lib/analytics/analytics.types';
import {
  SHAREABLE_RESOURCE_LIBRARY_MAPPING,
  SHAREABLE_RESOURCE_PRODUCT_MAPPING,
  type ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';

export const toAnalyticsLibraryParams = (
  resourceType: ShareableResourceType
): AnalyticsLibraryParams => ({
  library: SHAREABLE_RESOURCE_LIBRARY_MAPPING[resourceType],
  product: SHAREABLE_RESOURCE_PRODUCT_MAPPING[resourceType],
});

export const toAnalyticsItem = (
  { id, name }: AnalyticsResource,
  resourceType: ShareableResourceType,
  index?: number
): AnalyticsItem => {
  const { library, product } = toAnalyticsLibraryParams(resourceType);
  return {
    item_id: toAnalyticsResourceId(id),
    item_name: name ?? '',
    item_category: library,
    item_brand: product,
    ...(index === undefined ? {} : { index }),
  };
};

export const toAnalyticsUseCaseNames = (
  useCases: ReadonlyArray<{ name: string }> | null | undefined
): string[] =>
  (useCases ?? [])
    .map(({ name }) => name)
    .sort((first, second) => first.localeCompare(second, 'en'));

export const toAnalyticsUseCases = (
  useCases: ReadonlyArray<{ name: string }> | null | undefined
): string | undefined =>
  toAnalyticsUseCaseNames(useCases).join('|') || undefined;
