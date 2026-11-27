import { isInstance as isCustomApolloError } from 'apollo-errors';
import { decodeJwt, decodeProtectedHeader } from 'jose';
import {
  PlatformConfigurationStatus,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import {
  loadPlatformCredentialMatch,
  PlatformCredentialMatch,
} from '../../../security/platform-credential';
import { logApp } from '../../../utils/app-logger.util';
import { UnauthenticatedErrorCode } from '../../../utils/error/error.code';
import { CustomApolloError } from '../../../utils/error/error.type';
import { UnauthenticatedAccess } from '../../../utils/error/error.util';
import { OrganizationDomain } from '../../organization-management/organization/organization.domain';
import { PlatformAssertionDomain } from '../../registration/platform-assertion/platform-assertion.domain';
import { PlatformConfigurationDomain } from '../../registration/platform-configuration/platform-configuration.domain';
import {
  PLATFORM_ASSERTION_CLOCK_SKEW_SECONDS,
  PLATFORM_ASSERTION_KID_MAX_LENGTH,
  PLATFORM_ASSERTION_MAX_LENGTH,
  PlatformAssertionClaims,
  PlatformAssertionFailureReason,
  verifyPlatformAssertion,
} from './platform-assertion.util';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from './platform-token.util';

// Express lowercases header names: the products send `XTM-Hub-Platform-Assertion`.
export const PLATFORM_ASSERTION_HEADER = 'xtm-hub-platform-assertion';

export const PLATFORM_AUTHENTICATION_ERROR_CODES = [
  UnauthenticatedErrorCode.PlatformAssertionInvalid,
  UnauthenticatedErrorCode.PlatformKeyMismatch,
  UnauthenticatedErrorCode.PlatformTokenRefused,
] as const;

export type PlatformAuthenticationErrorCode =
  (typeof PLATFORM_AUTHENTICATION_ERROR_CODES)[number];

export type RegistrationCredentialMatch = Extract<
  PlatformCredentialMatch,
  { credential: 'registration' }
>;

export type PlatformAuthenticationMethod = 'assertion' | 'token';

export type PlatformAuthentication =
  // Neither an assertion nor a platform id and token: the caller keeps its own answer.
  | { outcome: 'missing' }
  | {
      outcome: 'refused';
      method: PlatformAuthenticationMethod;
      code: PlatformAuthenticationErrorCode;
    }
  | {
      outcome: 'authenticated';
      method: 'assertion';
      match: RegistrationCredentialMatch;
      claims: PlatformAssertionClaims;
    }
  // The token is judged by the caller, as before assertions: match is undefined when it matches nothing.
  | {
      outcome: 'token';
      method: 'token';
      platformId: string;
      token: string;
      match: PlatformCredentialMatch | undefined;
    };

export type PlatformAuthenticationRequest = {
  headers?: Readonly<Record<string, unknown>>;
};

export type PlatformAuthenticationOptions = {
  // What the operation itself names, read only when the headers do not.
  input?: { platformId?: string | null; token?: string | null };
  activeOnly?: boolean;
  // The path the assertion must be signed for (its htu claim), for a request that reads one resource.
  htu?: string;
};

// The refusals this file decides, next to the verifier's own reasons. Logged, never returned to the caller.
enum PlatformAssertionRefusal {
  UNREADABLE = 'UNREADABLE',
  PLATFORM_ID_MISMATCH = 'PLATFORM_ID_MISMATCH',
  UNKNOWN_KEY = 'UNKNOWN_KEY',
  IDENTIFIER_MISMATCH = 'IDENTIFIER_MISMATCH',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  TENANT_REQUIRED = 'TENANT_REQUIRED',
  HTU_MISMATCH = 'HTU_MISMATCH',
  INACTIVE_REGISTRATION = 'INACTIVE_REGISTRATION',
  NO_SUBSCRIBED_ORGANIZATION = 'NO_SUBSCRIBED_ORGANIZATION',
  REPLAYED = 'REPLAYED',
}

type AssertionRefusalReason =
  PlatformAssertionFailureReason | PlatformAssertionRefusal;

// A key the stored JWK cannot verify, or a signature by another key, means the product must reconnect.
const CODE_OF_VERIFIER_REASON: Record<
  PlatformAssertionFailureReason,
  PlatformAuthenticationErrorCode
> = {
  [PlatformAssertionFailureReason.MALFORMED]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.UNSUPPORTED_ALGORITHM]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.INVALID_TYPE]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.KEY_ID_MISMATCH]:
    UnauthenticatedErrorCode.PlatformKeyMismatch,
  [PlatformAssertionFailureReason.INVALID_PUBLIC_KEY]:
    UnauthenticatedErrorCode.PlatformKeyMismatch,
  [PlatformAssertionFailureReason.INVALID_SIGNATURE]:
    UnauthenticatedErrorCode.PlatformKeyMismatch,
  [PlatformAssertionFailureReason.INVALID_AUDIENCE]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.INVALID_ISSUER]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.INVALID_TIMESTAMPS]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.EXPIRED]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.NOT_YET_VALID]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.LIFETIME_TOO_LONG]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.INVALID_JTI]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
  [PlatformAssertionFailureReason.INVALID_HTU]:
    UnauthenticatedErrorCode.PlatformAssertionInvalid,
};

type AssertionVerdict =
  | {
      accepted: false;
      code: PlatformAuthenticationErrorCode;
      reason: AssertionRefusalReason;
    }
  | {
      accepted: true;
      match: RegistrationCredentialMatch;
      claims: PlatformAssertionClaims;
    };

type UnverifiedAssertion = {
  assertion: string;
  kid: string;
  iss: string;
  tenantId: string | null;
};

/**
 * The error a platform gets when its credentials are explicitly refused. Never carries the assertion or the token.
 */
export const buildPlatformAuthenticationError = (
  code: PlatformAuthenticationErrorCode
): CustomApolloError => {
  const error = UnauthenticatedAccess(code);
  error.extensions = { code };
  return error;
};

const isPlatformAuthenticationErrorCode = (
  code: unknown
): code is PlatformAuthenticationErrorCode =>
  PLATFORM_AUTHENTICATION_ERROR_CODES.some(
    (platformCode) => platformCode === code
  );

export const isPlatformAuthenticationError = (
  error: unknown
): error is CustomApolloError =>
  isCustomApolloError(error) &&
  isPlatformAuthenticationErrorCode(
    (error as CustomApolloError).extensions?.code
  );

const refuse = (
  code: PlatformAuthenticationErrorCode,
  reason: AssertionRefusalReason
): AssertionVerdict => ({ accepted: false, code, reason });

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const headerValue = (
  req: PlatformAuthenticationRequest,
  name: string
): string | undefined => {
  const value = req.headers?.[name];
  return isNonEmptyString(value) ? value : undefined;
};

const inputValue = (value: string | null | undefined): string | undefined =>
  isNonEmptyString(value) ? value : undefined;

// A missing tenant is the registration of the whole instance (null); any other non-string value is unreadable.
const readTenantId = (value: unknown): string | null | undefined => {
  if (value === undefined || value === null) {
    return null;
  }
  return isNonEmptyString(value) ? value : undefined;
};

// Unverified on purpose: these values only find the keyed registration, whose key then verifies the whole assertion.
const readUnverifiedAssertion = (
  assertion: string
): UnverifiedAssertion | undefined => {
  if (assertion.length > PLATFORM_ASSERTION_MAX_LENGTH) {
    return undefined;
  }
  try {
    const { kid } = decodeProtectedHeader(assertion);
    const { iss, tenant_id } = decodeJwt(assertion);
    const tenantId = readTenantId(tenant_id);
    if (
      !isNonEmptyString(kid) ||
      kid.length > PLATFORM_ASSERTION_KID_MAX_LENGTH ||
      !isNonEmptyString(iss) ||
      tenantId === undefined
    ) {
      return undefined;
    }
    return { assertion, kid, iss, tenantId };
  } catch {
    return undefined;
  }
};

const isSamePlatformId = (left: string, right: string): boolean =>
  left.toLowerCase() === right.toLowerCase();

const verifyKeyedAssertion = async (
  { assertion, kid, iss, tenantId }: UnverifiedAssertion,
  htu: string | undefined
): Promise<AssertionVerdict> => {
  const registration =
    await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndKeyId(
      { platform_id: iss, tenant_id: tenantId, public_key_id: kid }
    );
  if (!registration) {
    return refuse(
      UnauthenticatedErrorCode.PlatformKeyMismatch,
      PlatformAssertionRefusal.UNKNOWN_KEY
    );
  }
  const { platformConfiguration, platformIdentifier } = registration;

  const verification = await verifyPlatformAssertion(assertion, {
    platformId: iss,
    publicJwk: platformConfiguration.public_key,
  });
  if (!verification.valid) {
    return refuse(
      CODE_OF_VERIFIER_REASON[verification.reason],
      verification.reason
    );
  }
  const { claims } = verification;

  if (claims.identifier !== platformIdentifier) {
    return refuse(
      UnauthenticatedErrorCode.PlatformAssertionInvalid,
      PlatformAssertionRefusal.IDENTIFIER_MISMATCH
    );
  }
  const claimedTenantId = readTenantId(claims.tenant_id);
  if (claimedTenantId !== platformConfiguration.tenant_id) {
    return refuse(
      UnauthenticatedErrorCode.PlatformAssertionInvalid,
      PlatformAssertionRefusal.TENANT_MISMATCH
    );
  }
  // OpenAEV signs with one key per tenant: an assertion without tenant names no registration of it.
  if (
    platformIdentifier === PlatformIdentifier.Openaev &&
    claimedTenantId === null
  ) {
    return refuse(
      UnauthenticatedErrorCode.PlatformAssertionInvalid,
      PlatformAssertionRefusal.TENANT_REQUIRED
    );
  }
  if (htu !== undefined && claims.htu !== htu) {
    return refuse(
      UnauthenticatedErrorCode.PlatformAssertionInvalid,
      PlatformAssertionRefusal.HTU_MISMATCH
    );
  }
  if (platformConfiguration.status !== PlatformConfigurationStatus.Active) {
    return refuse(
      UnauthenticatedErrorCode.PlatformKeyMismatch,
      PlatformAssertionRefusal.INACTIVE_REGISTRATION
    );
  }
  // The organization is always the one of the registration the key belongs to, never one the request names.
  const organization =
    await OrganizationDomain.loadOrganizationSubscribedToServiceInstance(
      platformConfiguration.service_instance_id
    );
  if (!organization) {
    return refuse(
      UnauthenticatedErrorCode.PlatformKeyMismatch,
      PlatformAssertionRefusal.NO_SUBSCRIBED_ORGANIZATION
    );
  }

  // Last, so a refused assertion never burns its jti: the atomic insert is the single once-only check.
  const consumed = await PlatformAssertionDomain.consumeJti({
    jti: claims.jti,
    expiresAt: new Date(
      (claims.exp + PLATFORM_ASSERTION_CLOCK_SKEW_SECONDS) * 1000
    ),
  });
  if (!consumed) {
    return refuse(
      UnauthenticatedErrorCode.PlatformAssertionInvalid,
      PlatformAssertionRefusal.REPLAYED
    );
  }

  return {
    accepted: true,
    match: {
      platformId: platformConfiguration.platform_id,
      credential: 'registration',
      registration,
      organization,
    },
    claims,
  };
};

const logAssertionVerdict = (platformId: string, verdict: AssertionVerdict) => {
  if (verdict.accepted) {
    logApp.info('Platform authenticated', {
      method: 'assertion',
      platformId: verdict.match.platformId,
    });
    return;
  }
  logApp.warn('Platform authentication refused', {
    method: 'assertion',
    platformId,
    code: verdict.code,
    reason: verdict.reason,
  });
};

// GraphQL resolves every field of one request with the same request object: the directive or the guard of each
// field checks the assertion again. One assertion authenticates one HTTP request, so the verdict is kept per request
// instead of the second check failing as a replay.
const assertionVerdictsByRequest = new WeakMap<
  object,
  Map<string, Promise<AssertionVerdict>>
>();

const verifyAssertionOnce = (
  req: PlatformAuthenticationRequest,
  unverified: UnverifiedAssertion,
  htu: string | undefined
): Promise<AssertionVerdict> => {
  const verdicts =
    assertionVerdictsByRequest.get(req) ??
    new Map<string, Promise<AssertionVerdict>>();
  assertionVerdictsByRequest.set(req, verdicts);
  const key = JSON.stringify([htu ?? null, unverified.assertion]);
  const cached = verdicts.get(key);
  if (cached) {
    return cached;
  }
  const verdict = verifyKeyedAssertion(unverified, htu).then((result) => {
    logAssertionVerdict(unverified.iss, result);
    return result;
  });
  verdicts.set(key, verdict);
  return verdict;
};

const authenticateWithAssertion = async (
  req: PlatformAuthenticationRequest,
  assertion: unknown,
  { input, htu }: PlatformAuthenticationOptions
): Promise<PlatformAuthentication> => {
  const refused = (
    code: PlatformAuthenticationErrorCode,
    reason: AssertionRefusalReason,
    platformId?: string
  ): PlatformAuthentication => {
    logApp.warn('Platform authentication refused', {
      method: 'assertion',
      platformId,
      code,
      reason,
    });
    return { outcome: 'refused', method: 'assertion', code };
  };

  const unverified = isNonEmptyString(assertion)
    ? readUnverifiedAssertion(assertion)
    : undefined;
  if (!unverified) {
    return refused(
      UnauthenticatedErrorCode.PlatformAssertionInvalid,
      PlatformAssertionRefusal.UNREADABLE
    );
  }

  // Checked on every call, outside the per-request verdict: each field may name its own platform id.
  const claimedPlatformIds = [
    inputValue(input?.platformId),
    headerValue(req, PLATFORM_ID_HEADER),
  ].filter(isNonEmptyString);
  if (
    claimedPlatformIds.some(
      (platformId) => !isSamePlatformId(platformId, unverified.iss)
    )
  ) {
    return refused(
      UnauthenticatedErrorCode.PlatformAssertionInvalid,
      PlatformAssertionRefusal.PLATFORM_ID_MISMATCH,
      unverified.iss
    );
  }

  const verdict = await verifyAssertionOnce(req, unverified, htu);
  if (!verdict.accepted) {
    return { outcome: 'refused', method: 'assertion', code: verdict.code };
  }
  return {
    outcome: 'authenticated',
    method: 'assertion',
    match: verdict.match,
    claims: verdict.claims,
  };
};

const authenticateWithToken = async (
  req: PlatformAuthenticationRequest,
  { input, activeOnly }: PlatformAuthenticationOptions
): Promise<PlatformAuthentication> => {
  // The id and token come as a pair, from the headers or else from the input as before: a header token is never
  // completed by an input platform id.
  const headerToken = headerValue(req, PLATFORM_TOKEN_HEADER);
  const { token, platformId } = headerToken
    ? { token: headerToken, platformId: headerValue(req, PLATFORM_ID_HEADER) }
    : {
        token: inputValue(input?.token),
        platformId: inputValue(input?.platformId),
      };
  if (!token || !platformId) {
    return { outcome: 'missing' };
  }

  const match = await loadPlatformCredentialMatch({
    platform_id: platformId,
    token,
    activeOnly,
  });
  // A platform that enrolled a key authenticates with assertions only. A registration of another OpenAEV tenant
  // still on its token keeps working: without a match, only an active keyed registration refuses the token.
  const isTokenOfKeyedRegistration =
    match?.credential === 'registration'
      ? Boolean(match.registration.platformConfiguration.public_key_id)
      : match === undefined &&
        (await PlatformConfigurationDomain.hasActiveEnrolledKey(platformId));
  if (isTokenOfKeyedRegistration) {
    const code = UnauthenticatedErrorCode.PlatformTokenRefused;
    logApp.warn('Platform authentication refused', {
      method: 'token',
      platformId,
      code,
    });
    return { outcome: 'refused', method: 'token', code };
  }

  if (match) {
    logApp.info('Platform authenticated', {
      method: 'token',
      platformId: match.platformId,
      credential: match.credential,
    });
  }
  return { outcome: 'token', method: 'token', platformId, token, match };
};

/**
 * Authenticates a platform (OpenCTI, OpenAEV, XTM One) from its request: a signed assertion when the request carries
 * one, else its platform id and token. A request with an assertion is judged on it alone: a refused assertion is
 * never retried as a token. The organization of an accepted assertion is the one of its registration.
 */
export const authenticatePlatform = async (
  req: PlatformAuthenticationRequest | undefined,
  options: PlatformAuthenticationOptions = {}
): Promise<PlatformAuthentication> => {
  if (!req) {
    return { outcome: 'missing' };
  }
  const assertion = req.headers?.[PLATFORM_ASSERTION_HEADER];
  if (assertion !== undefined) {
    return authenticateWithAssertion(req, assertion, options);
  }
  return authenticateWithToken(req, options);
};
