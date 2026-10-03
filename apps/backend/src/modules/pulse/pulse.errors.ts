import { GraphQLError } from 'graphql';

// Codes of the Threat Pulse wire contract, read by OpenCTI from
// `extensions.code`.
export enum PulseErrorCode {
  Unauthenticated = 'UNAUTHENTICATED',
  Forbidden = 'FORBIDDEN',
  BadUserInput = 'BAD_USER_INPUT',
  ContributionRequired = 'PULSE_CONTRIBUTION_REQUIRED',
  RateLimited = 'PULSE_RATE_LIMITED',
  Disabled = 'PULSE_DISABLED',
}

const PULSE_ERROR_CODES: ReadonlySet<string> = new Set(
  Object.values(PulseErrorCode)
);

const pulseError = (
  code: PulseErrorCode,
  message: string,
  extensions: Record<string, unknown> = {}
): GraphQLError =>
  new GraphQLError(message, { extensions: { ...extensions, code } });

export const PulseErrors = {
  unauthenticated: (): GraphQLError =>
    pulseError(
      PulseErrorCode.Unauthenticated,
      'Threat Pulse requires an active platform registration'
    ),
  forbidden: (message: string): GraphQLError =>
    pulseError(PulseErrorCode.Forbidden, message),
  badUserInput: (message: string): GraphQLError =>
    pulseError(PulseErrorCode.BadUserInput, message),
  contributionRequired: (windowDays: number): GraphQLError =>
    pulseError(
      PulseErrorCode.ContributionRequired,
      `Reading Threat Pulse requires a contribution over the last ${windowDays} days`
    ),
  rateLimited: (retryAfterSeconds: number): GraphQLError =>
    pulseError(
      PulseErrorCode.RateLimited,
      `Threat Pulse rate limit reached, retry in ${retryAfterSeconds} seconds`,
      { retry_after_seconds: retryAfterSeconds }
    ),
  disabled: (): GraphQLError =>
    pulseError(
      PulseErrorCode.Disabled,
      'Threat Pulse is not enabled on this XTM Hub'
    ),
};

export const isPulseError = (error: unknown): error is GraphQLError =>
  error instanceof GraphQLError &&
  typeof error.extensions.code === 'string' &&
  PULSE_ERROR_CODES.has(error.extensions.code);
