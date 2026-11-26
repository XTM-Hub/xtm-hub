import { afterEach, describe, expect, it, vi } from 'vitest';
import { XtmoneIntegrationStatus } from '../../__generated__/resolvers-types';
import { logApp } from '../../utils/app-logger.util';
import { fetchXtmoneIntegrationStatus } from './xtmone';

const integrationStatus: XtmoneIntegrationStatus = {
  opencti: { status: 'connected', connected: true, last_checked_at: null },
  openaev: { status: 'connected', connected: true, last_checked_at: null },
  linked: true,
  last_checked_at: null,
};

describe('fetchXtmoneIntegrationStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each`
    baseUrl                | description
    ${'not-a-url'}         | ${'a malformed url'}
    ${'ftp://xtmone.io'}   | ${'a non-http(s) protocol'}
    ${'file:///etc/hosts'} | ${'a file protocol'}
  `(
    'returns null without fetching for $description',
    async ({ baseUrl }: { baseUrl: string }) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchXtmoneIntegrationStatus(baseUrl);

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it('fetches the platform config without credentials and returns the integration status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ integration_status: integrationStatus }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchXtmoneIntegrationStatus(
      'https://xtmone.example.io'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://xtmone.example.io/api/v1/platform/config',
      expect.objectContaining({ credentials: 'omit', redirect: 'error' })
    );
    expect(result).toEqual(integrationStatus);
  });

  it('supports http urls and preserves the host when building the config url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ integration_status: integrationStatus }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchXtmoneIntegrationStatus('http://localhost:8080/base/path');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/platform/config',
      expect.anything()
    );
  });

  it('returns null when the platform responds with a non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 502 })
    );

    const result = await fetchXtmoneIntegrationStatus(
      'https://xtmone.example.io'
    );

    expect(result).toBeNull();
  });

  it.each`
    body                                       | description
    ${{}}                                      | ${'no integration_status'}
    ${{ integration_status: {} }}              | ${'missing opencti and openaev'}
    ${{ integration_status: { opencti: {} } }} | ${'missing openaev'}
    ${{ integration_status: { openaev: {} } }} | ${'missing opencti'}
  `(
    'returns null when the payload has $description',
    async ({ body }: { body: unknown }) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => body })
      );

      const result = await fetchXtmoneIntegrationStatus(
        'https://xtmone.example.io'
      );

      expect(result).toBeNull();
    }
  );

  it('returns null and logs a warning when the fetch throws', async () => {
    const warnSpy = vi.spyOn(logApp, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down'))
    );

    const result = await fetchXtmoneIntegrationStatus(
      'https://xtmone.example.io'
    );

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to fetch XTM One integration status',
      expect.objectContaining({ xtmoneOrigin: 'https://xtmone.example.io' })
    );
  });
});
