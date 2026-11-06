import {
  createPortalGraphqlClient,
  getAuthenticatedGraphqlClient,
  resolveGraphqlApiEndpoint,
} from '@/lib/graphql-client';
import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import { ClientError } from 'graphql-request';
import { graphql, http, HttpResponse } from 'msw';
import { cookies } from 'next/headers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type Cookie = { name: string; value: string };

const OPERATION_NAME = 'Settings';
const QUERY = `query ${OPERATION_NAME} { settings { base_url_front } }`;
const SETTINGS = { settings: { base_url_front: 'https://hub.filigran.io' } };
const CLIENT_API = 'https://api.filigran.io';
const SERVER_API = 'http://backend:4002';
const SESSION_ID = 'session-id';
const SESSION_COOKIE = `session=${SESSION_ID}`;
const ERROR_MESSAGE = 'Organization not found';
const EMAIL = 'analyst@filigran.io';

const captureRequest = () => {
  const captured: { url?: string; cookie?: string | null } = {};
  mswServer.use(
    graphql.query(OPERATION_NAME, ({ request }) => {
      captured.url = request.url;
      captured.cookie = request.headers.get('cookie');
      return HttpResponse.json({ data: SETTINGS });
    })
  );
  return captured;
};

describe('resolveGraphqlApiEndpoint', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    [CLIENT_API, `${CLIENT_API}/graphql-api`],
    [`${CLIENT_API}/`, `${CLIENT_API}/graphql-api`],
  ])(
    'should target the public API when the browser is given %s',
    (clientApi, expectedEndpoint) => {
      // Given
      vi.stubEnv('NEXT_PUBLIC_CLIENT_HTTP_API', clientApi);

      // When
      const endpoint = resolveGraphqlApiEndpoint();

      // Then
      expect(endpoint).toBe(expectedEndpoint);
    }
  );

  it('should target the current origin when the browser has no public API', () => {
    // Given
    vi.stubEnv('NEXT_PUBLIC_CLIENT_HTTP_API', '');

    // When
    const endpoint = resolveGraphqlApiEndpoint();

    // Then
    expect(endpoint).toBe(`${window.location.origin}/graphql-api`);
  });

  it.each([
    [SERVER_API, `${SERVER_API}/graphql-api`],
    ['', 'http://localhost:4002/graphql-api'],
  ])(
    'should target the server API when rendering on the server with %j',
    (serverApi, expectedEndpoint) => {
      // Given
      vi.stubGlobal('window', undefined);
      vi.stubEnv('NEXT_PUBLIC_CLIENT_HTTP_API', CLIENT_API);
      vi.stubEnv('SERVER_HTTP_API', serverApi);

      // When
      const endpoint = resolveGraphqlApiEndpoint();

      // Then
      expect(endpoint).toBe(expectedEndpoint);
    }
  );
});

describe('createPortalGraphqlClient', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_CLIENT_HTTP_API', CLIENT_API);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should send the operation to the resolved API endpoint', async () => {
    // Given
    const captured = captureRequest();

    // When
    await createPortalGraphqlClient().request(QUERY);

    // Then
    expect(captured.url).toBe(`${CLIENT_API}/graphql-api`);
  });

  it('should return the operation data when the API answers', async () => {
    // Given
    mswServer.use(
      mockGraphqlQuery({ queryName: OPERATION_NAME, data: SETTINGS })
    );

    // When
    const data = await createPortalGraphqlClient().request(QUERY);

    // Then
    expect(data).toEqual(SETTINGS);
  });

  it.each([
    [SESSION_COOKIE, SESSION_COOKIE],
    [undefined, null],
  ])(
    'should forward the cookie %j to the API',
    async (cookie, expectedCookie) => {
      // Given
      const captured = captureRequest();

      // When
      await createPortalGraphqlClient(cookie).request(QUERY);

      // Then
      expect(captured.cookie).toBe(expectedCookie);
    }
  );

  it('should reject with an UnauthenticatedError when the API reports an anonymous visitor', async () => {
    // Given
    mswServer.use(
      mockGraphqlQuery({
        queryName: OPERATION_NAME,
        errors: [
          { message: ERROR_MESSAGE },
          {
            message: 'You must be logged in',
            extensions: { code: 'UNAUTHENTICATED' },
          },
        ],
      })
    );

    // When
    const request = createPortalGraphqlClient().request(QUERY);

    // Then
    await expect(request).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('should reject with the first API error message when the operation fails', async () => {
    // Given
    mswServer.use(
      mockGraphqlQuery({
        queryName: OPERATION_NAME,
        errors: [{ message: ERROR_MESSAGE }, { message: 'Second error' }],
      })
    );

    // When
    const request = createPortalGraphqlClient().request(QUERY);

    // Then
    await expect(request).rejects.toThrowError(
      new RegExp(`^${ERROR_MESSAGE}$`)
    );
  });

  it('should reject with the client error when the API answers without GraphQL errors', async () => {
    // Given
    mswServer.use(
      http.post(`${CLIENT_API}/graphql-api`, () =>
        HttpResponse.text('Bad gateway', { status: 502 })
      )
    );

    // When
    const request = createPortalGraphqlClient().request(QUERY);

    // Then
    await expect(request).rejects.toBeInstanceOf(ClientError);
  });

  it.each([
    [
      'mutation UpdatePassword($password: String!, $email: String!) { updatePassword }',
      `[GraphQL:Client MUTATION] UpdatePassword -> ${CLIENT_API}/graphql-api`,
    ],
    [
      '{ updatePassword }',
      `[GraphQL:Client QUERY] Anonymous -> ${CLIENT_API}/graphql-api`,
    ],
  ])(
    'should trace %s with its sensitive variables hidden in development',
    async (document, expectedTrace) => {
      // Given
      vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      mswServer.use(
        graphql.operation(() =>
          HttpResponse.json({ data: { updatePassword: true } })
        )
      );

      // When
      await createPortalGraphqlClient().request(document, {
        password: 'p4ssw0rd',
        email: EMAIL,
      });

      // Then
      expect(log).toHaveBeenCalledWith(expectedTrace, {
        variables: { password: '[HIDDEN]', email: EMAIL },
      });
    }
  );

  it.each([['staging'], ['production']])(
    'should not trace operations in %s',
    async (appEnv) => {
      // Given
      vi.stubEnv('NEXT_PUBLIC_APP_ENV', appEnv);
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      mswServer.use(
        mockGraphqlQuery({ queryName: OPERATION_NAME, data: SETTINGS })
      );

      // When
      await createPortalGraphqlClient().request(QUERY);

      // Then
      expect(log).not.toHaveBeenCalled();
    }
  );
});

describe('getAuthenticatedGraphqlClient', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const givenVisitorCookies = (cookieList: Cookie[]) => {
    vi.mocked(cookies).mockResolvedValue({
      getAll: () => cookieList,
    } as CookieStore);
  };

  it('should forward the visitor cookies to the API', async () => {
    // Given
    givenVisitorCookies([
      { name: 'session', value: SESSION_ID },
      { name: 'locale', value: 'en' },
    ]);
    const captured = captureRequest();

    // When
    const client = await getAuthenticatedGraphqlClient();
    await client.request(QUERY);

    // Then
    expect(captured.cookie).toBe(`${SESSION_COOKIE}; locale=en`);
  });

  it('should send no cookie when the visitor has none', async () => {
    // Given
    givenVisitorCookies([]);
    const captured = captureRequest();

    // When
    const client = await getAuthenticatedGraphqlClient();
    await client.request(QUERY);

    // Then
    expect(captured.cookie).toBeNull();
  });
});
