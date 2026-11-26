export const RESEND_VERIFICATION_EMAIL_ENDPOINT = '/auth/verification-email';

const TOO_MANY_REQUESTS_STATUS = 429;

export type ResendVerificationEmailErrorCode =
  'TOO_MANY_REQUESTS' | 'NO_PENDING_VERIFICATION' | 'VERIFICATION_EMAIL_FAILED';

const KNOWN_ERROR_CODES: ReadonlySet<string> =
  new Set<ResendVerificationEmailErrorCode>([
    'TOO_MANY_REQUESTS',
    'NO_PENDING_VERIFICATION',
    'VERIFICATION_EMAIL_FAILED',
  ]);

const isKnownErrorCode = (
  value: unknown
): value is ResendVerificationEmailErrorCode =>
  typeof value === 'string' && KNOWN_ERROR_CODES.has(value);

export class ResendVerificationEmailError extends Error {
  constructor(readonly code: ResendVerificationEmailErrorCode) {
    super(`Resending the verification email failed: ${code}`);
    this.name = 'ResendVerificationEmailError';
  }
}

const readErrorCode = async (
  response: Response
): Promise<ResendVerificationEmailErrorCode> => {
  const body: unknown = await response.json().catch(() => null);
  const code =
    body && typeof body === 'object' && 'error' in body ? body.error : null;
  if (isKnownErrorCode(code)) {
    return code;
  }
  // A rate limiter in front of the API answers 429 without our JSON body.
  return response.status === TOO_MANY_REQUESTS_STATUS
    ? 'TOO_MANY_REQUESTS'
    : 'VERIFICATION_EMAIL_FAILED';
};

/**
 * Asks the backend to resend the verification email of the sign-in it just
 * refused. It identifies the user from the session: nothing is sent.
 */
export const requestVerificationEmail = async (): Promise<void> => {
  const response = await fetch(RESEND_VERIFICATION_EMAIL_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new ResendVerificationEmailError(await readErrorCode(response));
  }
};

interface ResendVerificationEmailMessageKeys {
  title: string;
  description: string;
}

const ERROR_MESSAGE_KEYS: Record<
  ResendVerificationEmailErrorCode,
  ResendVerificationEmailMessageKeys
> = {
  TOO_MANY_REQUESTS: {
    title: 'SignUpPage.ResendVerificationEmail.TooManyRequests.Title',
    description:
      'SignUpPage.ResendVerificationEmail.TooManyRequests.Description',
  },
  NO_PENDING_VERIFICATION: {
    title: 'SignUpPage.ResendVerificationEmail.NoPendingVerification.Title',
    description:
      'SignUpPage.ResendVerificationEmail.NoPendingVerification.Description',
  },
  VERIFICATION_EMAIL_FAILED: {
    title: 'SignUpPage.ResendVerificationEmail.Failed.Title',
    description: 'SignUpPage.ResendVerificationEmail.Failed.Description',
  },
};

// A network failure rejects with a plain error: it gets the generic message.
export const getResendVerificationEmailErrorMessageKeys = (
  error: unknown
): ResendVerificationEmailMessageKeys =>
  ERROR_MESSAGE_KEYS[
    error instanceof ResendVerificationEmailError
      ? error.code
      : 'VERIFICATION_EMAIL_FAILED'
  ];
