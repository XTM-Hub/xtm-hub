const SAAS_MANAGER_TOKEN_PATH = '/oauth2/token/';
const SAAS_MANAGER_TOKEN_TIMEOUT_MS = 10_000;
// The token is renewed once less than this remains, so a request never leaves with an about-to-expire token.
const SAAS_MANAGER_TOKEN_RENEWAL_MARGIN_MS = 60_000;

export interface SaasManagerTokenProviderOptions {
  baseUrl: string;
  clientId: string;
  clientSecret: string | null;
}

export interface SaasManagerTokenProvider {
  getAccessToken: () => Promise<string>;
  invalidate: (accessToken: string) => void;
}

interface CachedToken {
  accessToken: string;
  renewAt: number;
}

export class SaasManagerTokenError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SaasManagerTokenError';
  }
}

// RFC 6749 §2.3.1: the client ID and secret are form-encoded before being joined for HTTP Basic.
const formEncode = (value: string): string =>
  new URLSearchParams({ value }).toString().slice('value='.length);

const readOAuthErrorCode = (body: unknown): string | null => {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string' &&
    /^[a-z_]+$/.test(body.error)
  ) {
    return body.error;
  }
  return null;
};

const describeTokenFailure = (
  host: string,
  status: number,
  errorCode: string | null
): string => {
  switch (errorCode) {
    case 'invalid_client':
      return `SaaS Manager at ${host} rejected the client credentials (invalid_client): check SAAS_MANAGER_CLIENT_ID and SAAS_MANAGER_CLIENT_SECRET`;
    case 'unauthorized_client':
      return `SaaS Manager at ${host} refused the client credentials grant (unauthorized_client): its OAuth2 application must use the "Client credentials" grant type`;
    default:
      return `SaaS Manager at ${host} answered HTTP ${status} on its token endpoint${errorCode ? ` (${errorCode})` : ''}`;
  }
};

const parseTokenBody = (
  body: unknown
): { accessToken: string; expiresInMs: number } | null => {
  if (
    typeof body === 'object' &&
    body !== null &&
    'access_token' in body &&
    typeof body.access_token === 'string' &&
    body.access_token !== '' &&
    'expires_in' in body &&
    typeof body.expires_in === 'number' &&
    body.expires_in > 0
  ) {
    return {
      accessToken: body.access_token,
      expiresInMs: body.expires_in * 1000,
    };
  }
  return null;
};

const requestToken = async ({
  baseUrl,
  clientId,
  clientSecret,
}: SaasManagerTokenProviderOptions): Promise<CachedToken> => {
  const host = new URL(baseUrl).host;
  if (!clientSecret) {
    throw new SaasManagerTokenError(
      `SAAS_MANAGER_CLIENT_SECRET is not configured for SaaS Manager at ${host}`
    );
  }
  const credentials = Buffer.from(
    `${formEncode(clientId)}:${formEncode(clientSecret)}`
  ).toString('base64');
  // Measured before the call, so the network time counts against the token lifetime.
  const requestedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(new URL(SAAS_MANAGER_TOKEN_PATH, baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
      redirect: 'error',
      signal: AbortSignal.timeout(SAAS_MANAGER_TOKEN_TIMEOUT_MS),
    });
  } catch (error) {
    throw new SaasManagerTokenError(
      `Unable to reach the SaaS Manager token endpoint at ${host}`,
      { cause: error }
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SaasManagerTokenError(
      describeTokenFailure(host, response.status, readOAuthErrorCode(body))
    );
  }
  const token = parseTokenBody(body);
  if (!token) {
    throw new SaasManagerTokenError(
      `SaaS Manager at ${host} answered its token endpoint without a usable access_token and expires_in`
    );
  }
  return {
    accessToken: token.accessToken,
    renewAt:
      requestedAt + token.expiresInMs - SAAS_MANAGER_TOKEN_RENEWAL_MARGIN_MS,
  };
};

/**
 * OAuth2 client credentials (RFC 6749 §4.4) against SaaS Manager. There is no refresh token: a token close to expiry is
 * replaced by running the grant again. Concurrent callers share the same in-flight request.
 */
export const createSaasManagerTokenProvider = (
  options: SaasManagerTokenProviderOptions
): SaasManagerTokenProvider => {
  let cachedToken: CachedToken | null = null;
  let pendingToken: Promise<string> | null = null;

  return {
    getAccessToken: async () => {
      if (cachedToken && Date.now() < cachedToken.renewAt) {
        return cachedToken.accessToken;
      }
      pendingToken ??= requestToken(options)
        .then((token) => {
          cachedToken = token;
          return token.accessToken;
        })
        .finally(() => {
          pendingToken = null;
        });
      return pendingToken;
    },
    // Only drops the token that was rejected, so a 401 on a stale token never discards a newer one.
    invalidate: (accessToken) => {
      if (cachedToken?.accessToken === accessToken) {
        cachedToken = null;
      }
    },
  };
};
