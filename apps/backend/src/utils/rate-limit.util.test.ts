import express, {
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MANIFEST_ERRORS } from '../server/endpoints/manifest/manifest-endpoint.errors';
import { logApp } from './app-logger.util';
import { parseTrustProxy } from './config-validation.util';
import { ErrorCode } from './error/error.code';
import {
  buildDocumentDownloadIpRateLimiterOptions,
  buildDocumentDownloadUserRateLimiterOptions,
  buildGraphqlAnonymousRateLimiterOptions,
  buildGraphqlUserRateLimiterOptions,
  buildManifestRateLimiterOptions,
  buildProductVersionRateLimiterOptions,
  buildRateLimiterOptions,
  buildVerificationEmailIpRateLimiterOptions,
  buildVerificationEmailSubjectRateLimiterOptions,
  createKeyRateLimiter,
  isPrivateIp,
} from './rate-limit.util';

const CLIENT_A = '198.51.100.20';
const CLIENT_B = '198.51.100.21';
const FORGED_IP = '203.0.113.7';
const OTHER_FORGED_IP = '203.0.113.8';

const buildIpLimiter = () =>
  rateLimit(
    buildRateLimiterOptions({
      windowMs: 60 * 1000,
      limit: 1,
      logLabel: 'Test',
      sendRateLimitError: (res) => {
        res.status(429).end();
      },
    })
  );

// The /auth limiter relies on the express-rate-limit default key.
const buildDefaultKeyLimiter = () =>
  rateLimit({ windowMs: 60 * 1000, limit: 1 });

const startServer = async (
  limiter: RequestHandler,
  ...before: RequestHandler[]
) => {
  const app = express();
  // Same value the API gets from TRUST_PROXY=1.
  app.set('trust proxy', parseTrustProxy('1'));
  app.get('/limited', ...before, limiter, (_req, res) => {
    res.status(204).end();
  });
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}/limited` };
};

const getStatus = async (url: string, forwardedFor: string) =>
  (await fetch(url, { headers: { 'x-forwarded-for': forwardedFor } })).status;

describe.each([
  ['buildRateLimiterOptions', buildIpLimiter],
  ['the default key generator', buildDefaultKeyLimiter],
])(
  'ip rate limiting behind one trusted proxy with %s',
  (_description, buildLimiter: () => RequestHandler) => {
    let server: Server | undefined;
    let url: string;

    beforeEach(async () => {
      vi.restoreAllMocks();
      vi.spyOn(logApp, 'warn').mockImplementation(() => {});
      ({ server, url } = await startServer(buildLimiter()));
    });

    afterEach(async () => {
      await new Promise((resolve) => server?.close(resolve));
    });

    it('should share one bucket when only the forged left-hand entries differ', async () => {
      // Given
      const firstForwardedFor = `${FORGED_IP}, ${CLIENT_A}`;
      const secondForwardedFor = `${OTHER_FORGED_IP}, ${CLIENT_A}`;

      // When
      const statuses = [
        await getStatus(url, firstForwardedFor),
        await getStatus(url, secondForwardedFor),
      ];

      // Then
      expect(statuses).toEqual([204, 429]);
    });

    it('should give each client its own bucket when their rightmost entries differ', async () => {
      // Given
      const clients = [CLIENT_A, CLIENT_B, CLIENT_A] as const;

      // When
      const statuses = [
        await getStatus(url, clients[0]),
        await getStatus(url, clients[1]),
        await getStatus(url, clients[2]),
      ];

      // Then
      expect(statuses).toEqual([204, 204, 429]);
    });
  }
);

// Only the default key generator runs the X-Forwarded-For validation: with a
// custom keyGenerator this test would pass whatever the trust proxy value.
describe('ip rate limiting validation with the default key generator', () => {
  let server: Server | undefined;
  let url: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    ({ server, url } = await startServer(buildDefaultKeyLimiter()));
  });

  afterEach(async () => {
    await new Promise((resolve) => server?.close(resolve));
  });

  it('should raise no express-rate-limit validation error when X-Forwarded-For is set', async () => {
    // Given
    const consoleError = vi.spyOn(console, 'error');

    // When
    await getStatus(url, `${FORGED_IP}, ${CLIENT_A}`);

    // Then
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('isPrivateIp', () => {
  it.each`
    ip                      | expected
    ${'10.1.2.3'}           | ${true}
    ${'172.20.0.4'}         | ${true}
    ${'192.168.1.10'}       | ${true}
    ${'127.0.0.1'}          | ${true}
    ${'100.64.3.2'}         | ${true}
    ${'::1'}                | ${true}
    ${'fd00::12'}           | ${true}
    ${'::ffff:10.0.0.5'}    | ${true}
    ${undefined}            | ${true}
    ${'203.0.113.7'}        | ${false}
    ${'172.32.0.1'}         | ${false}
    ${'::ffff:203.0.113.7'} | ${false}
    ${'2001:db8::1'}        | ${false}
    ${'not-an-ip'}          | ${false}
  `(
    'should tell that $ip is private: $expected',
    ({ ip, expected }: { ip: string | undefined; expected: boolean }) => {
      // When
      const result = isPrivateIp(ip);

      // Then
      expect(result).toBe(expected);
    }
  );
});

describe('createKeyRateLimiter', () => {
  it('should refuse a key over the limit and keep the other keys apart', async () => {
    // Given
    const limiter = createKeyRateLimiter({ windowMs: 60 * 1000, limit: 2 });
    await limiter.tryConsume('a');
    await limiter.tryConsume('a');

    // When
    const third = await limiter.tryConsume('a');
    const other = await limiter.tryConsume('b');

    // Then
    expect(third).toBe(false);
    expect(other).toBe(true);
  });

  it('should allow a key again once reset', async () => {
    // Given
    const limiter = createKeyRateLimiter({ windowMs: 60 * 1000, limit: 1 });
    await limiter.tryConsume('a');
    await limiter.reset();

    // When
    const result = await limiter.tryConsume('a');

    // Then
    expect(result).toBe(true);
  });
});

describe('createKeyRateLimiter.consumeOrThrow', () => {
  it('should throw TOO_MANY_REQUESTS once the key is over the limit', async () => {
    // Given
    const limiter = createKeyRateLimiter({ windowMs: 60 * 1000, limit: 1 });
    await limiter.consumeOrThrow('a');

    // When
    const call = limiter.consumeOrThrow('a');

    // Then
    await expect(call).rejects.toThrow(ErrorCode.TooManyRequests);
  });
});

describe('createKeyRateLimiter.tryConsumeForIp', () => {
  it.each`
    description                                    | firstIp          | secondIp          | expected
    ${'the same key twice from one address'}       | ${'203.0.113.7'} | ${'203.0.113.7'}  | ${false}
    ${'the same key from two addresses'}           | ${'203.0.113.7'} | ${'198.51.100.2'} | ${true}
    ${'the same key twice from a private address'} | ${'10.0.3.12'}   | ${'10.0.3.12'}    | ${true}
  `(
    'should allow $description: $expected',
    async ({
      firstIp,
      secondIp,
      expected,
    }: {
      firstIp: string;
      secondIp: string;
      expected: boolean;
    }) => {
      // Given
      const limiter = createKeyRateLimiter({ windowMs: 60 * 1000, limit: 1 });
      await limiter.tryConsumeForIp(firstIp, 'document-1');

      // When
      const result = await limiter.tryConsumeForIp(secondIp, 'document-1');

      // Then
      expect(result).toBe(expected);
    }
  );
});

describe('buildRateLimiterOptions.skip', () => {
  const buildRequest = (ip: string, path = '/limited') =>
    ({ ip, path }) as unknown as Request;

  it.each`
    description                               | config                     | ip               | expected
    ${'nothing by default'}                   | ${{}}                      | ${'10.0.3.12'}   | ${false}
    ${'a private address with skipPrivateIp'} | ${{ skipPrivateIp: true }} | ${'10.0.3.12'}   | ${true}
    ${'a public address with skipPrivateIp'}  | ${{ skipPrivateIp: true }} | ${'203.0.113.7'} | ${false}
    ${'what the given skip leaves out'}       | ${{ skip: () => true }}    | ${'203.0.113.7'} | ${true}
  `(
    'should skip $description: $expected',
    async ({
      config,
      ip,
      expected,
    }: {
      config: { skipPrivateIp?: boolean; skip?: () => boolean };
      ip: string;
      expected: boolean;
    }) => {
      // Given
      const options = buildRateLimiterOptions({
        windowMs: 60 * 1000,
        limit: 1,
        logLabel: 'Test',
        ...config,
      });

      // When
      const skipped = await options.skip!(buildRequest(ip), {} as Response);

      // Then
      expect(skipped).toBe(expected);
    }
  );
});

// region Limiters

const PUBLIC_IP = '203.0.113.7';
const SESSION_USER_ID = 'c9e8fee1-8cb4-4fff-b335-5ea350615df4';
const PLATFORM_ID = 'c9e8fee1-8cb4-4fff-b335-5ea350615df4';
const USER_TOKEN = 'b6a1d0c2-3f4e-4a5b-9c8d-7e6f5a4b3c2d';
const OTHER_USER_TOKEN = '0f1e2d3c-4b5a-4968-8776-655443322110';
const IDP_SUBJECT = 'auth0|unverified-user';

const buildMockRequest = ({
  ip = PUBLIC_IP,
  method = 'GET',
  headers = {},
  sessionUserId,
  unverifiedIdpSubject,
}: {
  ip?: string;
  method?: string;
  headers?: Record<string, string>;
  sessionUserId?: string;
  unverifiedIdpSubject?: string;
}) => {
  const lowerCaseHeaders = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    ip,
    method,
    path: '/limited',
    headers: lowerCaseHeaders,
    header: (name: string) => lowerCaseHeaders[name.toLowerCase()],
    session: {
      ...(sessionUserId ? { user: { id: sessionUserId } } : {}),
      unverifiedIdpSubject,
    },
  } as unknown as Request;
};

/**
 * Runs the limiter in Express with a limit of one, so that express-rate-limit calls the handler with its resolved
 * options, and returns the answers to two requests from one public address.
 */
const sendTwiceOverLimit = async (
  options: Partial<Options>,
  ...before: RequestHandler[]
) => {
  const { server, url } = await startServer(
    rateLimit({ ...options, limit: 1 }),
    ...before
  );
  try {
    const send = () =>
      fetch(url, { headers: { 'x-forwarded-for': PUBLIC_IP } });
    const allowed = await send();
    const limited = await send();
    return { allowed, limited, send };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

describe('buildGraphqlUserRateLimiterOptions', () => {
  it('should key the limiter by the signed-in user, whatever the address', async () => {
    // Given
    const keyGenerator = buildGraphqlUserRateLimiterOptions().keyGenerator!;

    // When
    const first = await keyGenerator(
      buildMockRequest({ sessionUserId: SESSION_USER_ID, ip: PUBLIC_IP }),
      {} as Response
    );
    const second = await keyGenerator(
      buildMockRequest({ sessionUserId: SESSION_USER_ID, ip: CLIENT_A }),
      {} as Response
    );

    // Then
    expect(first).toBe(`user:${SESSION_USER_ID}`);
    expect(second).toBe(first);
  });

  it.each`
    description               | request                                                                    | expected
    ${'a signed-in request'}  | ${buildMockRequest({ sessionUserId: SESSION_USER_ID })}                    | ${false}
    ${'an anonymous request'} | ${buildMockRequest({})}                                                    | ${true}
    ${'a preflight request'}  | ${buildMockRequest({ sessionUserId: SESSION_USER_ID, method: 'OPTIONS' })} | ${true}
  `(
    'should skip $description: $expected',
    async ({ request, expected }: { request: Request; expected: boolean }) => {
      // When
      const skipped = await buildGraphqlUserRateLimiterOptions().skip!(
        request,
        {} as Response
      );

      // Then
      expect(skipped).toBe(expected);
    }
  );
});

describe('buildGraphqlAnonymousRateLimiterOptions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
  });

  it.each`
    description                                      | request                                                 | expected
    ${'an anonymous request from a public address'}  | ${buildMockRequest({})}                                 | ${false}
    ${'a signed-in request'}                         | ${buildMockRequest({ sessionUserId: SESSION_USER_ID })} | ${true}
    ${'the server rendering from a private address'} | ${buildMockRequest({ ip: '10.0.3.12' })}                | ${true}
    ${'a preflight request'}                         | ${buildMockRequest({ method: 'OPTIONS' })}              | ${true}
  `(
    'should skip $description: $expected',
    async ({ request, expected }: { request: Request; expected: boolean }) => {
      // When
      const skipped = await buildGraphqlAnonymousRateLimiterOptions().skip!(
        request,
        {} as Response
      );

      // Then
      expect(skipped).toBe(expected);
    }
  );

  it('should answer a GraphQL error with the TOO_MANY_REQUESTS code once over the limit', async () => {
    // When
    const { allowed, limited } = await sendTwiceOverLimit(
      buildGraphqlAnonymousRateLimiterOptions()
    );

    // Then
    expect(allowed.status).toBe(204);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({
      errors: [
        {
          message: 'TOO_MANY_REQUESTS',
          extensions: { code: 'TOO_MANY_REQUESTS' },
        },
      ],
    });
  });
});

describe('buildDocumentDownloadUserRateLimiterOptions', () => {
  const platformRequest = (userToken: string, ip = PUBLIC_IP) =>
    buildMockRequest({
      ip,
      headers: {
        'XTM-Hub-Platform-Id': PLATFORM_ID,
        'XTM-Hub-User-Platform-Token': userToken,
      },
    });

  const keyOf = async (req: Request) =>
    buildDocumentDownloadUserRateLimiterOptions().keyGenerator!(
      req,
      {} as Response
    );

  it('should key a Hub session by its user', async () => {
    // When
    const key = await keyOf(buildMockRequest({ sessionUserId: 'user-1' }));

    // Then
    expect(key).toBe('user:user-1');
  });

  it('should give each user of one platform its own key, without the raw token', async () => {
    // When
    const first = await keyOf(platformRequest(USER_TOKEN));
    const second = await keyOf(platformRequest(OTHER_USER_TOKEN));

    // Then
    expect(first).not.toBe(second);
    expect(first).toMatch(new RegExp(`^platform:${PLATFORM_ID}\\|user:`));
    expect(first).not.toContain(USER_TOKEN);
  });

  it('should keep the key of a platform user when the address changes', async () => {
    // When
    const first = await keyOf(platformRequest(USER_TOKEN, PUBLIC_IP));
    const second = await keyOf(platformRequest(USER_TOKEN, CLIENT_A));

    // Then
    expect(second).toBe(first);
  });

  it('should key an anonymous caller by its address', async () => {
    // When
    const key = await keyOf(buildMockRequest({}));

    // Then
    expect(key).toBe(`ip:${PUBLIC_IP}`);
  });
});

describe('buildDocumentDownloadIpRateLimiterOptions', () => {
  it.each`
    ip             | expected
    ${PUBLIC_IP}   | ${false}
    ${'10.0.3.12'} | ${true}
  `(
    'should skip the address $ip: $expected',
    async ({ ip, expected }: { ip: string; expected: boolean }) => {
      // When
      const skipped = await buildDocumentDownloadIpRateLimiterOptions().skip!(
        buildMockRequest({ ip }),
        {} as Response
      );

      // Then
      expect(skipped).toBe(expected);
    }
  );
});

describe('buildVerificationEmailSubjectRateLimiterOptions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
  });

  it('should share one bucket per refused account whatever the IP', async () => {
    // Given
    const keyGenerator =
      buildVerificationEmailSubjectRateLimiterOptions().keyGenerator!;

    // When
    const first = await keyGenerator(
      buildMockRequest({ ip: CLIENT_A, unverifiedIdpSubject: IDP_SUBJECT }),
      {} as Response
    );
    const second = await keyGenerator(
      buildMockRequest({ ip: CLIENT_B, unverifiedIdpSubject: IDP_SUBJECT }),
      {} as Response
    );

    // Then
    expect(first).toBe(second);
  });

  it.each([
    ['without a refused account in the session', undefined, true],
    ['with a refused account in the session', IDP_SUBJECT, false],
  ])(
    'should skip the limiter %s: %s',
    async (_description, unverifiedIdpSubject, expected) => {
      // When
      const skipped = await buildVerificationEmailSubjectRateLimiterOptions()
        .skip!(buildMockRequest({ unverifiedIdpSubject }), {} as Response);

      // Then
      expect(skipped).toBe(expected);
    }
  );

  it.each([
    ['refused account', buildVerificationEmailSubjectRateLimiterOptions],
    ['IP', buildVerificationEmailIpRateLimiterOptions],
  ])(
    'should answer the error contract when the %s limit is reached',
    async (_description, buildOptions) => {
      // Given
      const withRefusedAccount: RequestHandler = (req, _res, next) => {
        Object.assign(req, {
          session: { unverifiedIdpSubject: IDP_SUBJECT },
        });
        next();
      };

      // When
      const { limited } = await sendTwiceOverLimit(
        buildOptions(),
        withRefusedAccount
      );

      // Then
      expect(limited.status).toBe(429);
      expect(await limited.json()).toEqual({ error: 'TOO_MANY_REQUESTS' });
    }
  );
});

describe('buildManifestRateLimiterOptions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should key the limiter by IP only, ignoring the User-Agent', async () => {
    // Given
    const keyGenerator = buildManifestRateLimiterOptions().keyGenerator!;

    // When
    const first = await keyGenerator(
      buildMockRequest({ headers: { 'user-agent': 'agent-a' } }),
      {} as Response
    );
    const second = await keyGenerator(
      buildMockRequest({ headers: { 'user-agent': 'agent-b' } }),
      {} as Response
    );

    // Then
    expect(first).toBe(second);
  });

  it('should answer a body matching the error contract when the limit is reached', async () => {
    // Given
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);

    // When
    const { limited } = await sendTwiceOverLimit(
      buildManifestRateLimiterOptions()
    );

    // Then
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({
      code: 429,
      message: MANIFEST_ERRORS.TooManyRequests.message,
    });
  });

  it('should log a warning on the first rejection only, within the throttling interval', async () => {
    // Given
    const warn = vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
    const options = buildManifestRateLimiterOptions();
    const { server, url } = await startServer(
      rateLimit({ ...options, limit: 1 })
    );

    // When
    try {
      await getStatus(url, PUBLIC_IP);
      await getStatus(url, PUBLIC_IP);
      await getStatus(url, PUBLIC_IP);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    // Then
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('buildProductVersionRateLimiterOptions', () => {
  it('should answer a body matching the error contract when the limit is reached', async () => {
    // Given
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);

    // When
    const { limited } = await sendTwiceOverLimit(
      buildProductVersionRateLimiterOptions()
    );

    // Then
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({
      code: 429,
      message: 'Too many requests, please try again later',
    });
  });
});

// endregion
