import {
  getResendVerificationEmailErrorMessageKeys,
  requestVerificationEmail,
  RESEND_VERIFICATION_EMAIL_ENDPOINT,
} from '@/components/signup/resend-verification-email.utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

const TOO_MANY_REQUESTS_KEYS = {
  title: 'SignUpPage.ResendVerificationEmail.TooManyRequests.Title',
  description: 'SignUpPage.ResendVerificationEmail.TooManyRequests.Description',
};
const NO_PENDING_VERIFICATION_KEYS = {
  title: 'SignUpPage.ResendVerificationEmail.NoPendingVerification.Title',
  description:
    'SignUpPage.ResendVerificationEmail.NoPendingVerification.Description',
};
const FAILED_KEYS = {
  title: 'SignUpPage.ResendVerificationEmail.Failed.Title',
  description: 'SignUpPage.ResendVerificationEmail.Failed.Description',
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const stubFetch = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('requestVerificationEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should post to the endpoint with the session cookie and no body when called', async () => {
    // Given the backend accepts the request
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    // When the verification email is requested
    await requestVerificationEmail();

    // Then the request carries only the session, no user identifier
    expect(fetchMock).toHaveBeenCalledWith(RESEND_VERIFICATION_EMAIL_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
    });
  });

  it('should resolve when the backend answers 204', async () => {
    // Given the backend sent the email
    stubFetch(new Response(null, { status: 204 }));

    // When the verification email is requested
    const request = requestVerificationEmail();

    // Then the request succeeds
    await expect(request).resolves.toBeUndefined();
  });

  it.each([
    {
      context: 'a 429 TOO_MANY_REQUESTS',
      response: () => jsonResponse(429, { error: 'TOO_MANY_REQUESTS' }),
      expected: TOO_MANY_REQUESTS_KEYS,
    },
    {
      context: 'a 429 without JSON body',
      response: () => new Response('Too Many Requests', { status: 429 }),
      expected: TOO_MANY_REQUESTS_KEYS,
    },
    {
      context: 'a 400 NO_PENDING_VERIFICATION',
      response: () => jsonResponse(400, { error: 'NO_PENDING_VERIFICATION' }),
      expected: NO_PENDING_VERIFICATION_KEYS,
    },
    {
      context: 'a 502 VERIFICATION_EMAIL_FAILED',
      response: () => jsonResponse(502, { error: 'VERIFICATION_EMAIL_FAILED' }),
      expected: FAILED_KEYS,
    },
    {
      context: 'a 400 with an unknown error code',
      response: () => jsonResponse(400, { error: 'SOMETHING_ELSE' }),
      expected: FAILED_KEYS,
    },
    {
      context: 'a 500 without body',
      response: () => new Response(null, { status: 500 }),
      expected: FAILED_KEYS,
    },
    {
      context: 'a 502 with a null JSON body',
      response: () => jsonResponse(502, null),
      expected: FAILED_KEYS,
    },
  ])(
    'should pick the matching message when the backend answers $context',
    async ({ response, expected }) => {
      // Given the backend refuses the request
      stubFetch(response());

      // When the verification email is requested
      const keys = await requestVerificationEmail().then(
        () => null,
        getResendVerificationEmailErrorMessageKeys
      );

      // Then the matching message is picked
      expect(keys).toEqual(expected);
    }
  );

  it('should map to the generic message when the network fails', async () => {
    // Given the request never reaches the backend
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    );

    // When the verification email is requested
    const keys = await requestVerificationEmail().then(
      () => null,
      getResendVerificationEmailErrorMessageKeys
    );

    // Then the generic message is picked
    expect(keys).toEqual(FAILED_KEYS);
  });
});
