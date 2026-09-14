import serverPortalApiFetch from '@/relay/server-portal-api-fetch';
import SettingsQuery, {
  settingsQuery,
  settingsQuery$data,
} from '@generated/settingsQuery.graphql';
import { FeatureFlag } from '@graphql/generated';

// Backend feature flags/providers can change (e.g. a flag flip) without a
// frontend redeploy. Rely on Next.js's fetch cache with a short revalidation
// window rather than an in-process cache: an indefinite in-memory cache would
// never notice such changes for the lifetime of the running server process.
const SETTINGS_REVALIDATE_SECONDS = 60;

export interface SettingsResponse {
  data: settingsQuery$data;
}

interface Settings {
  featureFlags: string[];
  providers: ReadonlyArray<{ provider: string }>;
}

async function fetchSettings(): Promise<Settings> {
  try {
    const response = (await serverPortalApiFetch<
      typeof SettingsQuery,
      settingsQuery
    >(
      SettingsQuery,
      {},
      { next: { revalidate: SETTINGS_REVALIDATE_SECONDS } }
    )) as SettingsResponse;
    return {
      featureFlags: [
        ...(response.data?.settings?.platform_feature_flags || []),
      ],
      providers: response.data?.settings?.platform_providers ?? [],
    };
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return { featureFlags: [], providers: [] };
  }
}

export async function isFeatureEnabled(
  flagName: FeatureFlag
): Promise<boolean> {
  const { featureFlags } = await fetchSettings();
  return featureFlags.some((flag) => [flagName as string].includes(flag));
}

export async function hasLocalProvider(): Promise<boolean> {
  const { providers } = await fetchSettings();
  return providers.some((p) => p.provider === 'local');
}
