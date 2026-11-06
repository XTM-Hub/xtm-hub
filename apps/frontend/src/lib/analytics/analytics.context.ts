import {
  ANALYTICS_EPIC_NAME_ATTRIBUTE,
  ANALYTICS_FEATURE_NAME_ATTRIBUTE,
  ANALYTICS_LIBRARY_ATTRIBUTE,
  ANALYTICS_PRODUCT_ATTRIBUTE,
  ANALYTICS_RESOURCE_ID_ATTRIBUTE,
  ANALYTICS_RESOURCE_NAME_ATTRIBUTE,
  ANALYTICS_SECTION_ATTRIBUTE,
  ANALYTICS_USE_CASES_ATTRIBUTE,
} from '@/lib/analytics/analytics.consts';
import { toAnalyticsResourceId } from '@/lib/analytics/analytics.page';
import {
  SHAREABLE_RESOURCE_LIBRARY_MAPPING,
  SHAREABLE_RESOURCE_PRODUCT_MAPPING,
  type ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { PlatformIdentifier } from '@graphql/generated';

const PRODUCT_LABELS = {
  [PlatformIdentifier.Openaev]: 'OpenAEV',
  [PlatformIdentifier.Opencti]: 'OpenCTI',
  [PlatformIdentifier.Xtmone]: 'XTM One',
} as const satisfies Record<PlatformIdentifier, string>;

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
}) => ({
  [ANALYTICS_RESOURCE_ID_ATTRIBUTE]: toAnalyticsResourceId(id),
  [ANALYTICS_RESOURCE_NAME_ATTRIBUTE]: name,
  [ANALYTICS_LIBRARY_ATTRIBUTE]: SHAREABLE_RESOURCE_LIBRARY_MAPPING[type],
  [ANALYTICS_USE_CASES_ATTRIBUTE]:
    (useCases ?? [])
      .map(({ name }) => name)
      .sort((first, second) => first.localeCompare(second, 'en'))
      .join('|') || undefined,
  [ANALYTICS_PRODUCT_ATTRIBUTE]: SHAREABLE_RESOURCE_PRODUCT_MAPPING[type],
});

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
