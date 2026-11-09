import { PlatformIdentifier } from '@graphql/generated';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectToRegisteredPlatform } from './registered-platform';
import { redirectToResource } from './resource';
import { GET } from './route';

vi.mock('./free-trial');
vi.mock('./handle-pending-user');
vi.mock('./registered-platform');
vi.mock('./registration');
vi.mock('./resource');
vi.mock('./transfer-perso-space');

const BASE_URL = 'http://localhost:3002';
const REDIRECT_RESPONSE = NextResponse.redirect(`${BASE_URL}/app`);

const callRoute = (identifier: string) => {
  const request = new NextRequest(`${BASE_URL}/redirect/${identifier}`);
  return {
    request,
    response: GET(request, { params: Promise.resolve({ identifier }) }),
  };
};

describe('GET /redirect/[identifier]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each`
    identifier                | platformIdentifier
    ${'opencti-registration'} | ${PlatformIdentifier.Opencti}
    ${'openaev-registration'} | ${PlatformIdentifier.Openaev}
  `(
    'should redirect $identifier to the $platformIdentifier registered platform',
    async ({
      identifier,
      platformIdentifier,
    }: {
      identifier: string;
      platformIdentifier: PlatformIdentifier;
    }) => {
      // Given
      vi.mocked(redirectToRegisteredPlatform).mockResolvedValue(
        REDIRECT_RESPONSE
      );

      // When
      const { request, response } = callRoute(identifier);

      // Then
      await expect(response).resolves.toBe(REDIRECT_RESPONSE);
      expect(redirectToRegisteredPlatform).toHaveBeenCalledWith(
        request,
        platformIdentifier
      );
      expect(redirectToResource).not.toHaveBeenCalled();
    }
  );
});
