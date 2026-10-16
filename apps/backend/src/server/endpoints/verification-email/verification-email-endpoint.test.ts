import express, { type Request, type Response } from 'express';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth0Client } from '../../../thirdparty/auth0/client';
import { AppLogsCategory, logApp } from '../../../utils/app-logger.util';
import {
  resendVerificationEmail,
  VERIFICATION_EMAIL_PATH,
  verificationEmailEndpoint,
} from './verification-email-endpoint';

const IDP_SUBJECT = 'auth0|unverified-user';

const SESSION_ID = 'a1b2c3d4e5f6g7h8';

const buildRequest = (unverifiedIdpSubject?: string) =>
  ({
    sessionID: SESSION_ID,
    session: unverifiedIdpSubject
      ? { referer: '/app', unverifiedIdpSubject }
      : { referer: '/app' },
  }) as unknown as Request;

const buildResponse = () => {
  const json = vi.fn();
  const end = vi.fn();
  const status = vi.fn().mockReturnValue({ json, end });
  return { res: { status } as unknown as Response, status, json };
};

describe('resendVerificationEmail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logApp, 'info').mockImplementation(() => {});
    vi.spyOn(logApp, 'warn').mockImplementation(() => {});
    vi.spyOn(logApp, 'error').mockImplementation(() => {});
  });

  it('should log which session had no pending verification, without its full id', async () => {
    // Given
    const warn = vi.spyOn(logApp, 'warn').mockImplementation(() => {});

    // When
    await resendVerificationEmail(buildRequest(), buildResponse().res);

    // Then
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'No pending verification in session',
      { sessionIdPrefix: 'a1b2c3d4', sessionKeys: ['referer'] },
      AppLogsCategory.LOGIN_PROVIDER
    );
  });

  it('should ask Auth0 to resend the email to the account refused in this session', async () => {
    // Given
    const sendVerificationEmail = vi
      .spyOn(auth0Client, 'sendVerificationEmail')
      .mockResolvedValue();

    // When
    await resendVerificationEmail(
      buildRequest(IDP_SUBJECT),
      buildResponse().res
    );

    // Then
    expect(sendVerificationEmail).toHaveBeenCalledExactlyOnceWith(IDP_SUBJECT);
  });

  it('should answer 204 once the email is sent', async () => {
    // Given
    vi.spyOn(auth0Client, 'sendVerificationEmail').mockResolvedValue();
    const { res, status } = buildResponse();

    // When
    await resendVerificationEmail(buildRequest(IDP_SUBJECT), res);

    // Then
    expect(status).toHaveBeenCalledWith(204);
  });

  it.each([
    [
      'no sign-in was refused in this session',
      undefined,
      () => Promise.resolve(),
      400,
      'NO_PENDING_VERIFICATION',
    ],
    [
      'Auth0 fails to send the email',
      IDP_SUBJECT,
      () => Promise.reject(new Error('auth0 down')),
      502,
      'VERIFICATION_EMAIL_FAILED',
    ],
  ])(
    'should answer the error contract when %s',
    async (_description, idpSubject, auth0Outcome, expectedStatus, error) => {
      // Given
      vi.spyOn(auth0Client, 'sendVerificationEmail').mockImplementation(
        auth0Outcome
      );
      const { res, status, json } = buildResponse();

      // When
      await resendVerificationEmail(buildRequest(idpSubject), res);

      // Then
      expect(status).toHaveBeenCalledWith(expectedStatus);
      expect(json).toHaveBeenCalledWith({ error });
    }
  );
});

describe('verificationEmailEndpoint', () => {
  let server: Server | undefined;
  let url: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(logApp, 'info').mockImplementation(() => {});
    vi.spyOn(logApp, 'warn').mockImplementation(() => {});
    vi.spyOn(logApp, 'error').mockImplementation(() => {});

    const app = express();
    // Stands in for express-session: the refused account comes from a header.
    app.use((req, _res, next) => {
      req.session = {
        unverifiedIdpSubject: req.header('x-test-subject'),
      } as Request['session'];
      next();
    });
    verificationEmailEndpoint(app);
    server = app.listen(0);
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    url = `http://127.0.0.1:${port}${VERIFICATION_EMAIL_PATH}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server?.close(resolve));
  });

  const post = async (idpSubject: string) =>
    (
      await fetch(url, {
        method: 'POST',
        headers: { 'x-test-subject': idpSubject },
      })
    ).status;

  it('should send at most one email per refused account per window', async () => {
    // Given
    vi.spyOn(auth0Client, 'sendVerificationEmail').mockResolvedValue();

    // When
    const statuses = [
      await post(IDP_SUBJECT),
      await post(IDP_SUBJECT),
      await post('auth0|another-user'),
    ];

    // Then
    expect(statuses).toEqual([204, 429, 204]);
  });

  it('should not count a failed send against the refused account', async () => {
    // Given
    vi.spyOn(auth0Client, 'sendVerificationEmail')
      .mockRejectedValueOnce(new Error('auth0 down'))
      .mockResolvedValue();

    // When
    const statuses = [await post(IDP_SUBJECT), await post(IDP_SUBJECT)];

    // Then
    expect(statuses).toEqual([502, 204]);
  });
});
