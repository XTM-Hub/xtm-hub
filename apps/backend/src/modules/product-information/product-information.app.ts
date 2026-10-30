import {
  FeatureFlag,
  OrderingMode,
  QuerySaasManagerPlatformsArgs,
  SaasPlatformData,
  SaasPlatformMetricsPeriod,
  SaasPlatformPage,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { isFeatureEnabled } from '../../utils/feature-flag.util';
import { RegistrationDomain } from '../registration/registration.domain';
import { ProductInformationHelper } from './product-information.helper';

// The metadata rarely changes and the metrics are aggregated by the hour: a short cache keeps page refreshes from
// reaching the SaaS Manager.
const SAAS_PLATFORM_DATA_CACHE_TTL_MS = 60_000;

// Each page is one call to the SaaS Manager: the size a caller asks for is bounded so it cannot make it list them all.
const SAAS_PLATFORMS_MAX_PAGE_SIZE = 500;

interface CachedSaasPlatformData {
  data: Promise<SaasPlatformData | null>;
  expiresAt: number;
}

const saasPlatformDataCache = new Map<string, CachedSaasPlatformData>();

/**
 * Concurrent callers share the same in-flight request. Only an answer is kept: a failure is dropped at once, so the
 * next view asks again instead of showing the platform as unavailable for the whole TTL.
 */
const loadCachedSaasPlatformData = (
  serviceInstanceId: ServiceInstanceId,
  platformId: string,
  metricsPeriod: SaasPlatformMetricsPeriod
): Promise<SaasPlatformData | null> => {
  const now = Date.now();
  const cacheKey = `${platformId}:${metricsPeriod}`;
  const cached = saasPlatformDataCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  for (const [cachedKey, entry] of saasPlatformDataCache) {
    if (entry.expiresAt <= now) {
      saasPlatformDataCache.delete(cachedKey);
    }
  }

  const entry: CachedSaasPlatformData = {
    data: ProductInformationHelper.fetchSaasPlatformData(
      serviceInstanceId,
      platformId,
      metricsPeriod
    ).then((data) => {
      if (data === null && saasPlatformDataCache.get(cacheKey) === entry) {
        saasPlatformDataCache.delete(cacheKey);
      }
      return data;
    }),
    expiresAt: now + SAAS_PLATFORM_DATA_CACHE_TTL_MS,
  };
  saasPlatformDataCache.set(cacheKey, entry);
  return entry.data;
};

export const ProductInformationApp = {
  loadRegisteredSaasPlatformData: async (
    serviceInstanceId: ServiceInstanceId,
    metricsPeriod: SaasPlatformMetricsPeriod
  ): Promise<SaasPlatformData | null> => {
    if (!isFeatureEnabled(FeatureFlag.SaasMetrics)) {
      return null;
    }

    // Resolve the platform through the organization-scoped query first, so that
    // the SaaS Manager is only ever called for a platform the user can access,
    // and with the platform_id stored in the Hub, never a client-supplied one.
    const [platform] =
      await RegistrationDomain.loadRegisteredPlatform(serviceInstanceId);
    if (!platform) {
      return null;
    }

    return loadCachedSaasPlatformData(
      serviceInstanceId,
      platform.platform_id,
      metricsPeriod
    );
  },

  loadSaasManagerPlatforms: async ({
    page,
    pageSize,
    orderBy,
    orderMode,
    searchTerm,
    product,
  }: QuerySaasManagerPlatformsArgs): Promise<SaasPlatformPage | null> => {
    if (!isFeatureEnabled(FeatureFlag.SaasMetrics)) {
      return null;
    }

    // The board pages as the SaaS Manager does: its page goes through as it is.
    return ProductInformationHelper.fetchSaasPlatforms({
      page: Math.max(1, page),
      page_size: Math.min(Math.max(1, pageSize), SAAS_PLATFORMS_MAX_PAGE_SIZE),
      search: searchTerm || undefined,
      product: product ?? undefined,
      ordering: `${orderMode === OrderingMode.Desc ? '-' : ''}${orderBy}`,
    });
  },
};
