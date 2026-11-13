import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import {
  buildDocumentDownloadIpRateLimiterOptions,
  buildDocumentDownloadUserRateLimiterOptions,
} from './document-download-endpoint.rate-limit';

const PUBLIC_IP = '203.0.113.7';
const PLATFORM_ID = 'c9e8fee1-8cb4-4fff-b335-5ea350615df4';
const USER_TOKEN = 'b6a1d0c2-3f4e-4a5b-9c8d-7e6f5a4b3c2d';
const OTHER_USER_TOKEN = '0f1e2d3c-4b5a-4968-8776-655443322110';

const buildRequest = ({
  ip = PUBLIC_IP,
  headers = {},
  sessionUserId,
}: {
  ip?: string;
  headers?: Record<string, string>;
  sessionUserId?: string;
}) => {
  const lowerCaseHeaders = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    ip,
    path: '/document/get/x/y',
    headers: lowerCaseHeaders,
    header: (name: string) => lowerCaseHeaders[name.toLowerCase()],
    session: sessionUserId ? { user: { id: sessionUserId } } : {},
  } as unknown as Request;
};

const platformRequest = (userToken: string, ip = PUBLIC_IP) =>
  buildRequest({
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

describe('buildDocumentDownloadUserRateLimiterOptions', () => {
  it('should key a Hub session by its user', async () => {
    // When
    const key = await keyOf(buildRequest({ sessionUserId: 'user-1' }));

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
    const second = await keyOf(platformRequest(USER_TOKEN, '198.51.100.20'));

    // Then
    expect(second).toBe(first);
  });

  it('should key an anonymous caller by its address', async () => {
    // When
    const key = await keyOf(buildRequest({}));

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
        buildRequest({ ip }),
        {} as Response
      );

      // Then
      expect(skipped).toBe(expected);
    }
  );
});
