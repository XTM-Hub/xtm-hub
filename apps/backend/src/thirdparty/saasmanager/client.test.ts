import config from 'config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaasManagerClient } from './client';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

describe('saasManagerClient.callInstanceApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends a GET request to the staging instance API with the token in the Authorization header', async () => {
    // Given
    const response = { ok: true, status: 200 };
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    // When
    const result = await SaasManagerClient.callInstanceApi();

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://saasmanager.staging.filigran.io/api/instance/'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `TOKEN ${config.get<string>('saas_manager.token')}`,
        }),
      })
    );
    expect(result).toBe(response);
  });

  it('sends a HEAD request when asked to', async () => {
    // Given
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    // When
    await SaasManagerClient.callInstanceApi({ method: 'HEAD' });

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ method: 'HEAD' })
    );
  });

  it('calls the instance API of the given platform', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await SaasManagerClient.callInstanceApi({ platform_id: 'platform-1' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'https://saasmanager.staging.filigran.io/api/instance/platform-1/'
      ),
      expect.any(Object)
    );
  });

  it('returns the response without throwing when the SaaS Manager responds with a non-ok status', async () => {
    const response = { ok: false, status: 404 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const result = await SaasManagerClient.callInstanceApi({
      platform_id: 'unknown-platform',
    });

    expect(result).toBe(response);
  });

  it('throws without fetching when no SaaS Manager URL is configured', async () => {
    vi.mocked(config.get).mockReturnValueOnce(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(SaasManagerClient.callInstanceApi()).rejects.toThrow(
      'SaaS Manager URL is not configured'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
