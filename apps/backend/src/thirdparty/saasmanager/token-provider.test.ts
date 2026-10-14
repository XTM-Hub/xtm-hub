import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaasManagerTokenProvider } from './token-provider';

const BASE_URL = 'https://saasmanager.test';
const HOST = 'saasmanager.test';
const CLIENT_ID = 'xtmHubClientId';
const CLIENT_SECRET = 'xtmHubClientSecret';
const BASIC_CREDENTIALS = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
  'base64'
);
const FIRST_TOKEN = 'first-access-token';
const SECOND_TOKEN = 'second-access-token';
const EXPIRES_IN_S = 3600;
const NOW = new Date('2026-10-13T10:00:00Z');

const makeProvider = (clientSecret: string | null = CLIENT_SECRET) =>
  createSaasManagerTokenProvider({
    baseUrl: BASE_URL,
    clientId: CLIENT_ID,
    clientSecret,
  });

const tokenResponse = (accessToken: string, expiresIn = EXPIRES_IN_S) =>
  Response.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: 'api',
  });

const stubTokenEndpoint = (...accessTokens: string[]) => {
  const fetchMock = vi.fn(async () =>
    tokenResponse(accessTokens.shift() ?? '')
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const errorText = (error: unknown): string =>
  error instanceof Error
    ? [error.message, error.stack, errorText(error.cause)].join('\n')
    : String(error ?? '');

describe('createSaasManagerTokenProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should request a token with HTTP Basic client authentication and the client credentials form body when no token is cached', async () => {
    // Given
    const fetchMock = stubTokenEndpoint(FIRST_TOKEN);

    // When
    await makeProvider().getAccessToken();

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(`${BASE_URL}/oauth2/token/`),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Basic ${BASIC_CREDENTIALS}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: 'grant_type=client_credentials',
      })
    );
  });

  it('should form-encode the client ID and secret before building the Basic credentials', async () => {
    // Given
    const fetchMock = stubTokenEndpoint(FIRST_TOKEN);
    const provider = createSaasManagerTokenProvider({
      baseUrl: BASE_URL,
      clientId: 'client id',
      clientSecret: 'se:cr&et',
    });

    // When
    await provider.getAccessToken();

    // Then
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('client+id:se%3Acr%26et').toString('base64')}`,
        }),
      })
    );
  });

  it('should return the access token answered by the token endpoint', async () => {
    // Given
    stubTokenEndpoint(FIRST_TOKEN);

    // When
    const accessToken = await makeProvider().getAccessToken();

    // Then
    expect(accessToken).toBe(FIRST_TOKEN);
  });

  it.each([
    ['far from expiry', 0, FIRST_TOKEN],
    ['61 s before expiry', (EXPIRES_IN_S - 61) * 1000, FIRST_TOKEN],
    ['59 s before expiry', (EXPIRES_IN_S - 59) * 1000, SECOND_TOKEN],
    ['expired', EXPIRES_IN_S * 1000 + 1, SECOND_TOKEN],
  ])(
    'should renew the cached token only once less than 60 s remain (%s)',
    async (_label, elapsedMs, expectedToken) => {
      // Given
      stubTokenEndpoint(FIRST_TOKEN, SECOND_TOKEN);
      const provider = makeProvider();
      await provider.getAccessToken();
      vi.setSystemTime(NOW.getTime() + elapsedMs);

      // When
      const accessToken = await provider.getAccessToken();

      // Then
      expect(accessToken).toBe(expectedToken);
    }
  );

  it('should share a single token request between concurrent callers', async () => {
    // Given
    let answerToken: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          answerToken = resolve;
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = makeProvider();

    // When
    const pending = Promise.all(
      Array.from({ length: 5 }, () => provider.getAccessToken())
    );
    answerToken(tokenResponse(FIRST_TOKEN));
    await pending;

    // Then
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should request a new token after a failed token request', async () => {
    // Given
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(tokenResponse(FIRST_TOKEN))
    );
    const provider = makeProvider();
    await provider.getAccessToken().catch(() => undefined);

    // When
    const accessToken = await provider.getAccessToken();

    // Then
    expect(accessToken).toBe(FIRST_TOKEN);
  });

  it.each([
    ['the rejected token', FIRST_TOKEN, SECOND_TOKEN],
    ['an older token than the cached one', 'older-access-token', FIRST_TOKEN],
  ])(
    'should drop the cached token only when invalidating %s',
    async (_label, invalidatedToken, expectedToken) => {
      // Given
      stubTokenEndpoint(FIRST_TOKEN, SECOND_TOKEN);
      const provider = makeProvider();
      await provider.getAccessToken();

      // When
      provider.invalidate(invalidatedToken);

      // Then
      expect(await provider.getAccessToken()).toBe(expectedToken);
    }
  );

  it.each([
    [
      'invalid_client',
      Response.json({ error: 'invalid_client' }, { status: 401 }),
      `SaaS Manager at ${HOST} rejected the client credentials (invalid_client): check SAAS_MANAGER_CLIENT_ID and SAAS_MANAGER_CLIENT_SECRET`,
    ],
    [
      'unauthorized_client',
      Response.json({ error: 'unauthorized_client' }, { status: 400 }),
      `SaaS Manager at ${HOST} refused the client credentials grant (unauthorized_client): its OAuth2 application must use the "Client credentials" grant type`,
    ],
    [
      'a server error',
      new Response('Bad gateway', { status: 502 }),
      `SaaS Manager at ${HOST} answered HTTP 502 on its token endpoint`,
    ],
    [
      'a token without expires_in',
      Response.json({ access_token: FIRST_TOKEN, token_type: 'Bearer' }),
      `SaaS Manager at ${HOST} answered its token endpoint without a usable access_token and expires_in`,
    ],
  ])(
    'should throw a clear error naming the host when the token endpoint answers %s',
    async (_label, response, expectedMessage) => {
      // Given
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

      // When
      const result = makeProvider().getAccessToken();

      // Then
      await expect(result).rejects.toThrow(expectedMessage);
    }
  );

  it('should throw a clear error naming the host when the token endpoint cannot be reached', async () => {
    // Given
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    );

    // When
    const result = makeProvider().getAccessToken();

    // Then
    await expect(result).rejects.toThrow(
      `Unable to reach the SaaS Manager token endpoint at ${HOST}`
    );
  });

  it('should throw without calling the token endpoint when no client secret is configured', async () => {
    // Given
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // When
    const result = makeProvider(null).getAccessToken();

    // Then
    await expect(result).rejects.toThrow(
      `SAAS_MANAGER_CLIENT_SECRET is not configured for SaaS Manager at ${HOST}`
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      'invalid_client',
      () => Response.json({ error: 'invalid_client' }, { status: 401 }),
    ],
    [
      'unauthorized_client',
      () => Response.json({ error: 'unauthorized_client' }, { status: 400 }),
    ],
    ['a server error', () => new Response(null, { status: 500 })],
    ['an unusable body', () => Response.json({})],
    ['a network failure', () => Promise.reject(new TypeError('fetch failed'))],
  ])(
    'should keep the client secret out of the error when the token endpoint answers %s',
    async (_label, answer) => {
      // Given
      vi.stubGlobal('fetch', vi.fn(answer));

      // When
      const error: unknown = await makeProvider()
        .getAccessToken()
        .catch((caught: unknown) => caught);

      // Then
      const text = errorText(error);
      expect(
        [CLIENT_SECRET, BASIC_CREDENTIALS].filter((secret) =>
          text.includes(secret)
        )
      ).toEqual([]);
    }
  );
});
