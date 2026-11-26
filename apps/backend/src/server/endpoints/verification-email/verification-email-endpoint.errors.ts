import type { Response } from 'express';

type VerificationEmailErrorStatus = 400 | 429 | 502;

interface VerificationEmailErrorDefinition {
  readonly error: string;
  readonly status: VerificationEmailErrorStatus;
}

export const VERIFICATION_EMAIL_ERRORS = {
  NoPendingVerification: { error: 'NO_PENDING_VERIFICATION', status: 400 },
  TooManyRequests: { error: 'TOO_MANY_REQUESTS', status: 429 },
  VerificationEmailFailed: { error: 'VERIFICATION_EMAIL_FAILED', status: 502 },
} as const satisfies Record<string, VerificationEmailErrorDefinition>;

type VerificationEmailError =
  (typeof VERIFICATION_EMAIL_ERRORS)[keyof typeof VERIFICATION_EMAIL_ERRORS];

export const sendVerificationEmailError = (
  res: Response,
  { error, status }: VerificationEmailError
): void => {
  res.status(status).json({ error });
};
