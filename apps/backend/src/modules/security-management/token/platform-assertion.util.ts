import {
  compactVerify,
  decodeProtectedHeader,
  errors as JoseErrors,
  type ProtectedHeaderParameters,
} from 'jose';

export const PLATFORM_ASSERTION_TYPE = 'xtm-hub-platform+jwt';
export const PLATFORM_ASSERTION_AUDIENCE = 'xtm-hub';
export const PLATFORM_ASSERTION_ALGORITHMS = ['EdDSA', 'Ed25519'];
export const PLATFORM_ASSERTION_MAX_LIFETIME_SECONDS = 300;
export const PLATFORM_ASSERTION_CLOCK_SKEW_SECONDS = 60;
export const PLATFORM_ASSERTION_MAX_LENGTH = 4096;
// Matches the CHECK (1-255) of the kid and jti columns.
export const PLATFORM_ASSERTION_KID_MAX_LENGTH = 255;
export const PLATFORM_ASSERTION_JTI_MAX_LENGTH = 255;

const ED25519_PUBLIC_KEY_BYTES = 32;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export type PlatformPublicJwk = {
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
  kid: string;
  alg?: string;
  use?: string;
};

// The caller maps these to error codes: KEY_ID_MISMATCH and INVALID_SIGNATURE are
// candidates for PLATFORM_KEY_MISMATCH, the rest for PLATFORM_ASSERTION_INVALID.
export enum PlatformAssertionFailureReason {
  MALFORMED = 'MALFORMED',
  UNSUPPORTED_ALGORITHM = 'UNSUPPORTED_ALGORITHM',
  INVALID_TYPE = 'INVALID_TYPE',
  KEY_ID_MISMATCH = 'KEY_ID_MISMATCH',
  INVALID_PUBLIC_KEY = 'INVALID_PUBLIC_KEY',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_AUDIENCE = 'INVALID_AUDIENCE',
  INVALID_ISSUER = 'INVALID_ISSUER',
  INVALID_TIMESTAMPS = 'INVALID_TIMESTAMPS',
  EXPIRED = 'EXPIRED',
  NOT_YET_VALID = 'NOT_YET_VALID',
  LIFETIME_TOO_LONG = 'LIFETIME_TOO_LONG',
  INVALID_JTI = 'INVALID_JTI',
  INVALID_HTU = 'INVALID_HTU',
}

export type PlatformAssertionClaims = {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  htu?: string;
  [claim: string]: unknown;
};

export type PlatformAssertionVerification =
  | { valid: true; claims: PlatformAssertionClaims }
  | { valid: false; reason: PlatformAssertionFailureReason };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maxLength;

const isAcceptedAlgorithm = (alg: unknown): boolean =>
  typeof alg === 'string' && PLATFORM_ASSERTION_ALGORITHMS.includes(alg);

const isEd25519PublicKeyValue = (x: unknown): x is string => {
  if (typeof x !== 'string' || !BASE64URL_PATTERN.test(x)) {
    return false;
  }
  const bytes = Buffer.from(x, 'base64url');
  // Re-encoding refuses non-canonical trailing bits.
  return (
    bytes.length === ED25519_PUBLIC_KEY_BYTES &&
    bytes.toString('base64url') === x
  );
};

export const isValidPublicJwk = (jwk: unknown): jwk is PlatformPublicJwk => {
  if (!isPlainObject(jwk) || 'd' in jwk) {
    return false;
  }
  return (
    jwk.kty === 'OKP' &&
    jwk.crv === 'Ed25519' &&
    isEd25519PublicKeyValue(jwk.x) &&
    isNonEmptyString(jwk.kid, PLATFORM_ASSERTION_KID_MAX_LENGTH) &&
    (jwk.alg === undefined || isAcceptedAlgorithm(jwk.alg)) &&
    (jwk.use === undefined || jwk.use === 'sig')
  );
};

const invalid = (
  reason: PlatformAssertionFailureReason
): PlatformAssertionVerification => ({ valid: false, reason });

const decodeHeader = (
  assertion: string
): ProtectedHeaderParameters | undefined => {
  try {
    return decodeProtectedHeader(assertion);
  } catch {
    return undefined;
  }
};

const verifySignature = async (
  assertion: string,
  publicJwk: PlatformPublicJwk
): Promise<
  | { verified: true; payload: Uint8Array }
  | { verified: false; reason: PlatformAssertionFailureReason }
> => {
  try {
    // Only the key material: a stored alg/use/kid must not clash with the header alg,
    // and any key carried by the header (jwk, jku, x5c) is never used.
    const { payload } = await compactVerify(
      assertion,
      { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x },
      { algorithms: PLATFORM_ASSERTION_ALGORITHMS }
    );
    return { verified: true, payload };
  } catch (error) {
    if (error instanceof JoseErrors.JWSSignatureVerificationFailed) {
      return {
        verified: false,
        reason: PlatformAssertionFailureReason.INVALID_SIGNATURE,
      };
    }
    if (error instanceof JoseErrors.JOSEError) {
      return {
        verified: false,
        reason: PlatformAssertionFailureReason.MALFORMED,
      };
    }
    // Outside jose errors, only the key import can fail here.
    return {
      verified: false,
      reason: PlatformAssertionFailureReason.INVALID_PUBLIC_KEY,
    };
  }
};

const parsePayload = (
  payload: Uint8Array
): Record<string, unknown> | undefined => {
  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(payload)
    );
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const readTimestamps = (
  { iat, exp, nbf }: Record<string, unknown>,
  now: Date
): { iat: number; exp: number } | PlatformAssertionFailureReason => {
  if (
    typeof iat !== 'number' ||
    typeof exp !== 'number' ||
    !Number.isFinite(iat) ||
    !Number.isFinite(exp) ||
    exp <= iat ||
    (nbf !== undefined && (typeof nbf !== 'number' || !Number.isFinite(nbf)))
  ) {
    return PlatformAssertionFailureReason.INVALID_TIMESTAMPS;
  }
  if (exp - iat > PLATFORM_ASSERTION_MAX_LIFETIME_SECONDS) {
    return PlatformAssertionFailureReason.LIFETIME_TOO_LONG;
  }
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const latestAcceptedStart =
    nowSeconds + PLATFORM_ASSERTION_CLOCK_SKEW_SECONDS;
  if (
    iat > latestAcceptedStart ||
    (nbf !== undefined && nbf > latestAcceptedStart)
  ) {
    return PlatformAssertionFailureReason.NOT_YET_VALID;
  }
  if (nowSeconds >= exp + PLATFORM_ASSERTION_CLOCK_SKEW_SECONDS) {
    return PlatformAssertionFailureReason.EXPIRED;
  }
  return { iat, exp };
};

/**
 * Verifies an Ed25519-signed platform assertion against the public JWK enrolled for the platform.
 * Pure: never throws for a bad assertion, never logs, and only returns the verified claims.
 * Consuming the jti and matching htu against the request is the caller's job.
 */
export const verifyPlatformAssertion = async (
  assertion: string,
  {
    platformId,
    publicJwk,
    now = new Date(),
  }: { platformId: string; publicJwk: unknown; now?: Date }
): Promise<PlatformAssertionVerification> => {
  if (!isNonEmptyString(assertion, PLATFORM_ASSERTION_MAX_LENGTH)) {
    return invalid(PlatformAssertionFailureReason.MALFORMED);
  }

  const header = decodeHeader(assertion);
  if (!header) {
    return invalid(PlatformAssertionFailureReason.MALFORMED);
  }
  if (!isAcceptedAlgorithm(header.alg)) {
    return invalid(PlatformAssertionFailureReason.UNSUPPORTED_ALGORITHM);
  }
  if (header.typ !== PLATFORM_ASSERTION_TYPE) {
    return invalid(PlatformAssertionFailureReason.INVALID_TYPE);
  }
  if (!isValidPublicJwk(publicJwk)) {
    return invalid(PlatformAssertionFailureReason.INVALID_PUBLIC_KEY);
  }
  if (header.kid !== publicJwk.kid) {
    return invalid(PlatformAssertionFailureReason.KEY_ID_MISMATCH);
  }

  const signature = await verifySignature(assertion, publicJwk);
  if (!signature.verified) {
    return invalid(signature.reason);
  }

  const payload = parsePayload(signature.payload);
  if (!payload) {
    return invalid(PlatformAssertionFailureReason.MALFORMED);
  }

  const { iss, aud, jti, htu } = payload;
  if (aud !== PLATFORM_ASSERTION_AUDIENCE) {
    return invalid(PlatformAssertionFailureReason.INVALID_AUDIENCE);
  }
  if (typeof iss !== 'string' || iss !== platformId) {
    return invalid(PlatformAssertionFailureReason.INVALID_ISSUER);
  }

  const timestamps = readTimestamps(payload, now);
  if (typeof timestamps === 'string') {
    return invalid(timestamps);
  }

  if (!isNonEmptyString(jti, PLATFORM_ASSERTION_JTI_MAX_LENGTH)) {
    return invalid(PlatformAssertionFailureReason.INVALID_JTI);
  }
  // htu is a bare request path, returned exactly as signed (no parsing or normalisation).
  if (
    htu !== undefined &&
    !isNonEmptyString(htu, PLATFORM_ASSERTION_MAX_LENGTH)
  ) {
    return invalid(PlatformAssertionFailureReason.INVALID_HTU);
  }

  return {
    valid: true,
    claims: {
      ...payload,
      iss,
      aud,
      ...timestamps,
      jti,
      ...(htu === undefined ? {} : { htu }),
    },
  };
};
