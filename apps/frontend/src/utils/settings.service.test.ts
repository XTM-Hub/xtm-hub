import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { ServerSettingsDocument } from '@graphql/generated';
import { mockPlatformProvider, mockSettings } from '@graphql/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server-graphql-fetch', () => ({
  serverGraphqlFetch: vi.fn(),
}));

const BASE_URL_FRONT = 'https://hub.filigran.io';

// The service keeps the settings in module state: each test loads a fresh copy.
const loadService = () => import('@/utils/settings.service');

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.resetModules();
});

describe('fetchServerSettings', () => {
  it('should read the settings from the cache shared by every visitor', async () => {
    // Given
    const settings = mockSettings({ base_url_front: BASE_URL_FRONT });
    vi.mocked(serverGraphqlFetch).mockResolvedValue({ settings });
    const { fetchServerSettings } = await loadService();

    // When
    const result = await fetchServerSettings();

    // Then
    expect(result).toEqual(settings);
    expect(serverGraphqlFetch).toHaveBeenCalledWith(
      ServerSettingsDocument,
      {},
      { cache: 'force-cache' }
    );
  });
});

describe('hasLocalProvider', () => {
  it.each([
    ['true', 'local', true],
    ['false', 'oidc', false],
  ])(
    'should return %s when the platform provider is %s',
    async (_label, provider, expected) => {
      // Given
      vi.mocked(serverGraphqlFetch).mockResolvedValue({
        settings: mockSettings({
          platform_providers: [mockPlatformProvider({ provider })],
        }),
      });
      const { hasLocalProvider } = await loadService();

      // When
      const result = await hasLocalProvider();

      // Then
      expect(result).toBe(expected);
    }
  );

  it('should return false when the settings cannot be fetched', async () => {
    // Given
    vi.mocked(serverGraphqlFetch).mockRejectedValue(new Error('API down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { hasLocalProvider } = await loadService();

    // When
    const result = await hasLocalProvider();

    // Then
    expect(result).toBe(false);
  });
});
