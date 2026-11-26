import {
  serverGraphqlFetch,
  ServerGraphqlFetchOptions,
} from '@/lib/server-graphql-fetch';
import {
  FeatureFlag,
  ServerSettingsDocument,
  ServerSettingsQuery,
} from '@graphql/generated';

// The settings are public: one cached response serves every visitor.
const SETTINGS_CACHE: ServerGraphqlFetchOptions = { cache: 'force-cache' };

let cachedFeatureFlags: string[];
let cachedProviders: ReadonlyArray<{ provider: string }>;

export async function fetchServerSettings(): Promise<
  ServerSettingsQuery['settings']
> {
  const data = await serverGraphqlFetch<ServerSettingsQuery>(
    ServerSettingsDocument,
    {},
    SETTINGS_CACHE
  );
  return data.settings;
}

async function fetchSettings(): Promise<void> {
  if (cachedFeatureFlags !== undefined) return;
  try {
    const settings = await fetchServerSettings();
    cachedFeatureFlags = [...settings.platform_feature_flags];
    cachedProviders = settings.platform_providers;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    cachedFeatureFlags = [];
    cachedProviders = [];
  }
}

export async function isFeatureEnabled(
  flagName: FeatureFlag
): Promise<boolean> {
  await fetchSettings();
  return cachedFeatureFlags?.some((flag) =>
    [flagName as string].includes(flag)
  );
}

export async function hasLocalProvider(): Promise<boolean> {
  await fetchSettings();
  return cachedProviders.some((p) => p.provider === 'local');
}
