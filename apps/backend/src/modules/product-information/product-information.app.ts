import { SaasPlatformData } from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { RegistrationDomain } from '../registration/registration.domain';
import { ProductInformationHelper } from './product-information.helper';

// The metadata rarely changes and the metrics are aggregated by the hour: a short cache keeps page refreshes from
// reaching the SaaS Manager.
const SAAS_PLATFORM_DATA_CACHE_TTL_MS = 60_000;

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
  platformId: string
): Promise<SaasPlatformData | null> => {
  const now = Date.now();
  const cached = saasPlatformDataCache.get(platformId);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  for (const [cachedPlatformId, entry] of saasPlatformDataCache) {
    if (entry.expiresAt <= now) {
      saasPlatformDataCache.delete(cachedPlatformId);
    }
  }

  const entry: CachedSaasPlatformData = {
    data: ProductInformationHelper.fetchSaasPlatformData(
      serviceInstanceId,
      platformId
    ).then((data) => {
      if (data === null && saasPlatformDataCache.get(platformId) === entry) {
        saasPlatformDataCache.delete(platformId);
      }
      return data;
    }),
    expiresAt: now + SAAS_PLATFORM_DATA_CACHE_TTL_MS,
  };
  saasPlatformDataCache.set(platformId, entry);
  return entry.data;
};

export const ProductInformationApp = {
  loadRegisteredSaasPlatformData: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<SaasPlatformData | null> => {
    // Resolve the platform through the organization-scoped query first, so that
    // the SaaS Manager is only ever called for a platform the user can access,
    // and with the platform_id stored in the Hub, never a client-supplied one.
    const [platform] =
      await RegistrationDomain.loadRegisteredPlatform(serviceInstanceId);
    if (!platform) {
      return null;
    }

    return loadCachedSaasPlatformData(serviceInstanceId, platform.platform_id);
  },
};
