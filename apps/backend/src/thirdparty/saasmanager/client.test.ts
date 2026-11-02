import config from 'config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaasManagerClient } from './client';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

const BASE_URL = 'https://saasmanager.test';
const CLIENT_ID = 'xtmHubClientId';
const CLIENT_SECRET = 'xtmHubClientSecret';
const FIRST_TOKEN = 'first-access-token';
const SECOND_TOKEN = 'second-access-token';
const TOKEN_PATH = '/oauth2/token/';
const realConfigGet = vi.mocked(config.get).getMockImplementation();

const useConfig = (overrides: Record<string, string | null>) => {
  vi.mocked(config.get).mockImplementation((key: string) =>
    key in overrides ? overrides[key] : realConfigGet?.(key)
  );
};

const stubSaasManager = (...apiResponses: Response[]) => {
  const tokens = [FIRST_TOKEN, SECOND_TOKEN];
  const fetchMock = vi.fn(async (url: URL, _init?: RequestInit) =>
    url.pathname === TOKEN_PATH
      ? Response.json({
          access_token: tokens.shift(),
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'api',
        })
      : (apiResponses.shift() ?? new Response(null, { status: 200 }))
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const apiCalls = (fetchMock: ReturnType<typeof stubSaasManager>) =>
  fetchMock.mock.calls.filter(([url]) => url.pathname !== TOKEN_PATH);

const apiAuthorizations = (fetchMock: ReturnType<typeof stubSaasManager>) =>
  apiCalls(fetchMock).map(([, init]) =>
    new Headers(init?.headers).get('Authorization')
  );

describe('saasManagerClient.callInstanceApi', () => {
  // A fresh client module per test, so the process-wide token cache never leaks from one test to the next.
  let client: typeof SaasManagerClient;

  beforeEach(async () => {
    vi.resetModules();
    client = (await import('./client')).SaasManagerClient;
    useConfig({
      'saas_manager.url': BASE_URL,
      'saas_manager.client_id': CLIENT_ID,
      'saas_manager.client_secret': CLIENT_SECRET,
    });
  });

  afterEach(() => {
    vi.mocked(config.get).mockImplementation(realConfigGet ?? (() => null));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends a GET request to the instance API with the access token in the Authorization header', async () => {
    // Given
    const response = new Response(null, { status: 200 });
    const fetchMock = stubSaasManager(response);

    // When
    const result = await client.callInstanceApi();

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(`${BASE_URL}/api/hub/instance/`),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Bearer ${FIRST_TOKEN}`,
        }),
      })
    );
    expect(result).toBe(response);
  });

  it('sends a HEAD request when asked to', async () => {
    // Given
    const fetchMock = stubSaasManager();

    // When
    await client.callInstanceApi({ method: 'HEAD' });

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ method: 'HEAD' })
    );
  });

  it('calls the instance API of the given platform', async () => {
    const fetchMock = stubSaasManager();

    await client.callInstanceApi({ platform_id: 'platform-1' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(`${BASE_URL}/api/hub/instance/platform-1/`),
      expect.any(Object)
    );
  });

  it('asks for the metrics of the given period when include_metrics is set', async () => {
    const fetchMock = stubSaasManager();

    await client.callInstanceApi({
      platform_id: 'platform-1',
      include_metrics: 30,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(`${BASE_URL}/api/hub/instance/platform-1/?include_metrics=30`),
      expect.any(Object)
    );
  });

  it('returns the response without throwing when the SaaS Manager responds with a non-ok status', async () => {
    const response = new Response(null, { status: 404 });
    stubSaasManager(response);

    const result = await client.callInstanceApi({
      platform_id: 'unknown-platform',
    });

    expect(result).toBe(response);
  });

  it('throws without fetching when no SaaS Manager URL is configured', async () => {
    vi.mocked(config.get).mockReturnValueOnce(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(client.callInstanceApi()).rejects.toThrow(
      'SaaS Manager URL is not configured'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should throw without fetching when no client ID is configured', async () => {
    // Given
    useConfig({ 'saas_manager.url': BASE_URL, 'saas_manager.client_id': null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // When
    const result = client.callInstanceApi();

    // Then
    await expect(result).rejects.toThrow(
      'SaaS Manager client ID is not configured'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['answers 200', [200], [`Bearer ${FIRST_TOKEN}`], 200],
    [
      'answers 401 once',
      [401, 200],
      [`Bearer ${FIRST_TOKEN}`, `Bearer ${SECOND_TOKEN}`],
      200,
    ],
    [
      'keeps answering 401',
      [401, 401],
      [`Bearer ${FIRST_TOKEN}`, `Bearer ${SECOND_TOKEN}`],
      401,
    ],
    ['answers 403', [403], [`Bearer ${FIRST_TOKEN}`], 403],
  ])(
    'should send the expected Bearer tokens when the instance API %s',
    async (_label, apiStatuses, expectedAuthorizations, expectedStatus) => {
      // Given
      const fetchMock = stubSaasManager(
        ...apiStatuses.map((status) => new Response(null, { status }))
      );

      // When
      const response = await client.callInstanceApi({
        platform_id: 'platform-1',
      });

      // Then
      expect({
        authorizations: apiAuthorizations(fetchMock),
        status: response.status,
      }).toEqual({
        authorizations: expectedAuthorizations,
        status: expectedStatus,
      });
    }
  );

  it('should reuse the cached token across instance API calls', async () => {
    // Given
    const fetchMock = stubSaasManager();
    await client.callInstanceApi({ platform_id: 'platform-1' });

    // When
    await client.callInstanceApi({ platform_id: 'platform-2' });

    // Then
    expect(apiAuthorizations(fetchMock)).toEqual([
      `Bearer ${FIRST_TOKEN}`,
      `Bearer ${FIRST_TOKEN}`,
    ]);
  });

  it('should keep the client secret out of the logged error when the token endpoint rejects the credentials', async () => {
    // Given
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: 'invalid_client' }, { status: 401 })
      )
    );

    // When
    const error: unknown = await client
      .callInstanceApi({ platform_id: 'platform-1' })
      .catch((caught: unknown) => caught);

    // Then
    expect(error instanceof Error ? error.message : '').toBe(
      'SaaS Manager at saasmanager.test rejected the client credentials (invalid_client): check SAAS_MANAGER_CLIENT_ID and SAAS_MANAGER_CLIENT_SECRET'
    );
  });
});

describe('saasManagerClient.callInstanceListApi', () => {
  // A fresh client module per test, so the process-wide token cache never leaks from one test to the next.
  let client: typeof SaasManagerClient;

  const request = {
    page: 2,
    page_size: 25,
    ordering: '-customer__name',
  };

  beforeEach(async () => {
    vi.resetModules();
    client = (await import('./client')).SaasManagerClient;
    useConfig({
      'saas_manager.url': BASE_URL,
      'saas_manager.client_id': CLIENT_ID,
      'saas_manager.client_secret': CLIENT_SECRET,
    });
  });

  afterEach(() => {
    vi.mocked(config.get).mockImplementation(realConfigGet ?? (() => null));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should send a GET request for the given page, page size, search and ordering of the instance list', async () => {
    // Given
    const response = new Response(null, { status: 200 });
    const fetchMock = stubSaasManager(response);

    // When
    const result = await client.callInstanceListApi({
      ...request,
      search: 'filigran corp',
    });

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        `${BASE_URL}/api/hub/instance/?page=2&page_size=25&search=filigran+corp&ordering=-customer__name`
      ),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Bearer ${FIRST_TOKEN}`,
        }),
      })
    );
    expect(result).toBe(response);
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
  ])('should not send a search when it is %s', async (_, search) => {
    // Given
    const fetchMock = stubSaasManager();

    // When
    await client.callInstanceListApi({ ...request, search });

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        `${BASE_URL}/api/hub/instance/?page=2&page_size=25&ordering=-customer__name`
      ),
      expect.any(Object)
    );
  });

  it('should send the product to filter the instance list on', async () => {
    // Given
    const fetchMock = stubSaasManager();

    // When
    await client.callInstanceListApi({ ...request, product: 'OAEV' });

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        `${BASE_URL}/api/hub/instance/?page=2&page_size=25&product=OAEV&ordering=-customer__name`
      ),
      expect.any(Object)
    );
  });

  it('should renew the token and retry once when the instance list answers 401', async () => {
    // Given
    const fetchMock = stubSaasManager(
      new Response(null, { status: 401 }),
      new Response(null, { status: 200 })
    );

    // When
    const response = await client.callInstanceListApi(request);

    // Then
    expect({
      authorizations: apiAuthorizations(fetchMock),
      status: response.status,
    }).toEqual({
      authorizations: [`Bearer ${FIRST_TOKEN}`, `Bearer ${SECOND_TOKEN}`],
      status: 200,
    });
  });

  it('should throw without fetching when no SaaS Manager URL is configured', async () => {
    // Given
    useConfig({ 'saas_manager.url': null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // When
    const result = client.callInstanceListApi(request);

    // Then
    await expect(result).rejects.toThrow('SaaS Manager URL is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
