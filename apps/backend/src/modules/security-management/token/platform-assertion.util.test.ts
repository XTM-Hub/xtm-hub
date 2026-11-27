import {
  CompactSign,
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  type JWK,
  type JWSHeaderParameters,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  OPENAEV_SAMPLE,
  OPENCTI_SAMPLE,
  XTM_ONE_SAMPLE,
} from './platform-assertion.fixtures';
import {
  isValidPublicJwk,
  PLATFORM_ASSERTION_AUDIENCE,
  PLATFORM_ASSERTION_MAX_LENGTH,
  PLATFORM_ASSERTION_TYPE,
  PlatformAssertionFailureReason,
  verifyPlatformAssertion,
} from './platform-assertion.util';

const NOW = new Date('2026-06-15T10:00:00.000Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);
const LIFETIME_SECONDS = 120;
const EXP_SECONDS = NOW_SECONDS + LIFETIME_SECONDS;
const PLATFORM_ID = '3b9f2c4e-8a1d-4f6b-9c2e-7d5a1b3c9e01';
const OTHER_PLATFORM_ID = 'a7c1e5d2-0b4f-4e8a-b6d3-2f9c8e1a5b07';
const KID = 'opencti-key-2026';
const JTI = 'b1f4e8c2-5d3a-4c7e-9f1b-6a2d8e4c0f13';
const IDENTIFIER = 'opencti-production';
const HTU =
  '/document/get/0c5e7a9b-3d1f-4b2e-8c6a-9e7d5f3b1a02/6f2a8c4e-1b9d-4e7a-a3c5-8d0f2b6e4a19';

const toSeconds = (seconds: number): Date => new Date(seconds * 1000);

const base64UrlJson = (value: Record<string, unknown>): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

type SignOptions = {
  header?: Partial<JWSHeaderParameters>;
  claims?: Record<string, unknown>;
  rawPayload?: string;
  key?: CryptoKey | Uint8Array;
};

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let publicJwk: JWK & { kid: string };
let privateJwk: JWK & { kid: string };
let otherPublicJwk: JWK;

const signAssertion = ({
  header = {},
  claims = {},
  rawPayload,
  key = privateKey,
}: SignOptions = {}): Promise<string> =>
  // CompactSign rather than SignJWT, which refuses ill-typed registered claims before signing.
  new CompactSign(
    new TextEncoder().encode(
      rawPayload ??
        JSON.stringify({
          iss: PLATFORM_ID,
          aud: PLATFORM_ASSERTION_AUDIENCE,
          iat: NOW_SECONDS,
          exp: EXP_SECONDS,
          jti: JTI,
          ...claims,
        })
    )
  )
    .setProtectedHeader({
      alg: 'EdDSA',
      typ: PLATFORM_ASSERTION_TYPE,
      kid: KID,
      ...header,
    })
    .sign(key);

const verify = (assertion: string, now: Date = NOW, jwk: unknown = publicJwk) =>
  verifyPlatformAssertion(assertion, {
    platformId: PLATFORM_ID,
    publicJwk: jwk,
    now,
  });

beforeAll(async () => {
  const keyPair = await generateKeyPair('Ed25519', { extractable: true });
  const otherKeyPair = await generateKeyPair('Ed25519', { extractable: true });
  privateKey = keyPair.privateKey;
  otherPrivateKey = otherKeyPair.privateKey;
  publicJwk = { ...(await exportJWK(keyPair.publicKey)), kid: KID };
  privateJwk = { ...(await exportJWK(keyPair.privateKey)), kid: KID };
  otherPublicJwk = await exportJWK(otherKeyPair.publicKey);
});

describe('verifyPlatformAssertion', () => {
  it.each(['EdDSA', 'Ed25519'])(
    'should return the claims when the assertion is signed with alg %s',
    async (alg) => {
      // Given
      const assertion = await signAssertion({
        header: { alg },
        claims: { identifier: IDENTIFIER },
      });

      // When
      const result = await verify(assertion, NOW, {
        ...publicJwk,
        alg: 'EdDSA',
        use: 'sig',
      });

      // Then
      expect(result).toEqual({
        valid: true,
        claims: {
          iss: PLATFORM_ID,
          aud: PLATFORM_ASSERTION_AUDIENCE,
          iat: NOW_SECONDS,
          exp: EXP_SECONDS,
          jti: JTI,
          identifier: IDENTIFIER,
        },
      });
    }
  );

  it('should return the htu exactly as signed when the assertion carries one', async () => {
    // Given
    const assertion = await signAssertion({ claims: { htu: HTU } });

    // When
    const result = await verify(assertion);

    // Then
    expect(result).toMatchObject({ valid: true, claims: { htu: HTU } });
  });

  it.each([
    {
      name: 'inside the clock skew after exp',
      claims: {},
      now: toSeconds(EXP_SECONDS + 59),
    },
    {
      name: 'its lifetime is exactly the maximum',
      claims: { exp: NOW_SECONDS + 300 },
      now: NOW,
    },
    {
      name: 'iat is exactly the clock skew ahead',
      claims: { iat: NOW_SECONDS + 60, exp: NOW_SECONDS + 180 },
      now: NOW,
    },
  ])('should accept the assertion when $name', async ({ claims, now }) => {
    // Given
    const assertion = await signAssertion({ claims });

    // When
    const result = await verify(assertion, now);

    // Then
    expect(result).toMatchObject({ valid: true });
  });

  it('should refuse the assertion when another key signed it', async () => {
    // Given
    const assertion = await signAssertion({ key: otherPrivateKey });

    // When
    const result = await verify(assertion);

    // Then
    expect(result).toEqual({
      valid: false,
      reason: PlatformAssertionFailureReason.INVALID_SIGNATURE,
    });
  });

  it('should ignore the key embedded in the header when another key signed the assertion', async () => {
    // Given
    const assertion = await signAssertion({
      header: { jwk: otherPublicJwk },
      key: otherPrivateKey,
    });

    // When
    const result = await verify(assertion);

    // Then
    expect(result).toEqual({
      valid: false,
      reason: PlatformAssertionFailureReason.INVALID_SIGNATURE,
    });
  });

  it.each(['[1,2]', '"a-string"', 'null', 'not-json'])(
    'should refuse the assertion as malformed when its signed payload is %s',
    async (rawPayload) => {
      // Given
      const assertion = await signAssertion({ rawPayload });

      // When
      const result = await verify(assertion);

      // Then
      expect(result).toEqual({
        valid: false,
        reason: PlatformAssertionFailureReason.MALFORMED,
      });
    }
  );

  it.each([
    {
      name: 'aud is another audience',
      claims: { aud: 'opencti' },
      reason: PlatformAssertionFailureReason.INVALID_AUDIENCE,
    },
    {
      name: 'aud is an array',
      claims: { aud: [PLATFORM_ASSERTION_AUDIENCE] },
      reason: PlatformAssertionFailureReason.INVALID_AUDIENCE,
    },
    {
      name: 'iss is another platform',
      claims: { iss: OTHER_PLATFORM_ID },
      reason: PlatformAssertionFailureReason.INVALID_ISSUER,
    },
    {
      name: 'iss is missing',
      claims: { iss: undefined },
      reason: PlatformAssertionFailureReason.INVALID_ISSUER,
    },
    {
      name: 'exp is not after iat',
      claims: { exp: NOW_SECONDS },
      reason: PlatformAssertionFailureReason.INVALID_TIMESTAMPS,
    },
    {
      name: 'iat is missing',
      claims: { iat: undefined },
      reason: PlatformAssertionFailureReason.INVALID_TIMESTAMPS,
    },
    {
      name: 'nbf is not a number',
      claims: { nbf: 'soon' },
      reason: PlatformAssertionFailureReason.INVALID_TIMESTAMPS,
    },
    {
      name: 'its lifetime is over the maximum',
      claims: { exp: NOW_SECONDS + 301 },
      reason: PlatformAssertionFailureReason.LIFETIME_TOO_LONG,
    },
    {
      name: 'iat is more than the clock skew ahead',
      claims: { iat: NOW_SECONDS + 61, exp: NOW_SECONDS + 181 },
      reason: PlatformAssertionFailureReason.NOT_YET_VALID,
    },
    {
      name: 'nbf is more than the clock skew ahead',
      claims: { nbf: NOW_SECONDS + 61 },
      reason: PlatformAssertionFailureReason.NOT_YET_VALID,
    },
    {
      name: 'jti is missing',
      claims: { jti: undefined },
      reason: PlatformAssertionFailureReason.INVALID_JTI,
    },
    {
      name: 'jti is empty',
      claims: { jti: '' },
      reason: PlatformAssertionFailureReason.INVALID_JTI,
    },
    {
      name: 'jti is longer than 255 characters',
      claims: { jti: 'j'.repeat(256) },
      reason: PlatformAssertionFailureReason.INVALID_JTI,
    },
    {
      name: 'htu is not a string',
      claims: { htu: 42 },
      reason: PlatformAssertionFailureReason.INVALID_HTU,
    },
    {
      name: 'htu is empty',
      claims: { htu: '' },
      reason: PlatformAssertionFailureReason.INVALID_HTU,
    },
  ])(
    'should refuse the assertion with $reason when $name',
    async ({ claims, reason }) => {
      // Given
      const assertion = await signAssertion({ claims });

      // When
      const result = await verify(assertion);

      // Then
      expect(result).toEqual({ valid: false, reason });
    }
  );

  it('should refuse the assertion as expired when exp plus the clock skew is reached', async () => {
    // Given
    const assertion = await signAssertion();

    // When
    const result = await verify(assertion, toSeconds(EXP_SECONDS + 60));

    // Then
    expect(result).toEqual({
      valid: false,
      reason: PlatformAssertionFailureReason.EXPIRED,
    });
  });

  it.each([
    {
      name: 'kid is another key',
      header: { kid: 'opencti-key-2025' },
      reason: PlatformAssertionFailureReason.KEY_ID_MISMATCH,
    },
    {
      name: 'kid is missing',
      header: { kid: undefined },
      reason: PlatformAssertionFailureReason.KEY_ID_MISMATCH,
    },
    {
      name: 'typ is JWT',
      header: { typ: 'JWT' },
      reason: PlatformAssertionFailureReason.INVALID_TYPE,
    },
    {
      name: 'typ is in another case',
      header: { typ: PLATFORM_ASSERTION_TYPE.toUpperCase() },
      reason: PlatformAssertionFailureReason.INVALID_TYPE,
    },
    {
      name: 'typ is missing',
      header: { typ: undefined },
      reason: PlatformAssertionFailureReason.INVALID_TYPE,
    },
  ])(
    'should refuse the assertion with $reason when the header $name',
    async ({ header, reason }) => {
      // Given
      const assertion = await signAssertion({ header });

      // When
      const result = await verify(assertion);

      // Then
      expect(result).toEqual({ valid: false, reason });
    }
  );

  it('should refuse an unsigned assertion when its header alg is none', async () => {
    // Given
    const header = base64UrlJson({
      alg: 'none',
      typ: PLATFORM_ASSERTION_TYPE,
      kid: KID,
    });
    const payload = base64UrlJson({
      iss: PLATFORM_ID,
      aud: PLATFORM_ASSERTION_AUDIENCE,
      iat: NOW_SECONDS,
      exp: EXP_SECONDS,
      jti: JTI,
    });
    const assertion = `${header}.${payload}.`;

    // When
    const result = await verify(assertion);

    // Then
    expect(result).toEqual({
      valid: false,
      reason: PlatformAssertionFailureReason.UNSUPPORTED_ALGORITHM,
    });
  });

  it('should refuse the assertion when it is signed with HS256', async () => {
    // Given
    const assertion = await signAssertion({
      header: { alg: 'HS256' },
      key: new TextEncoder().encode('a-shared-secret-of-at-least-32-bytes!'),
    });

    // When
    const result = await verify(assertion);

    // Then
    expect(result).toEqual({
      valid: false,
      reason: PlatformAssertionFailureReason.UNSUPPORTED_ALGORITHM,
    });
  });

  it('should refuse the assertion when its signature is not base64url', async () => {
    // Given
    const assertion = `${(await signAssertion()).split('.').slice(0, 2).join('.')}.not*base64`;

    // When
    const result = await verify(assertion);

    // Then
    expect(result).toEqual({
      valid: false,
      reason: PlatformAssertionFailureReason.MALFORMED,
    });
  });

  it.each([
    { name: 'empty', assertion: '' },
    { name: 'garbage', assertion: 'not-a-jwt' },
    { name: 'three garbage segments', assertion: 'a.b.c' },
    {
      name: 'over the maximum length',
      assertion: 'a'.repeat(PLATFORM_ASSERTION_MAX_LENGTH + 1),
    },
  ])(
    'should refuse the assertion as malformed when it is $name',
    async ({ assertion }) => {
      // Given
      const input = assertion;

      // When
      const result = await verify(input);

      // Then
      expect(result).toEqual({
        valid: false,
        reason: PlatformAssertionFailureReason.MALFORMED,
      });
    }
  );

  it('should refuse the assertion when the stored JWK carries a private part', async () => {
    // Given
    const assertion = await signAssertion();

    // When
    const result = await verify(assertion, NOW, privateJwk);

    // Then
    expect(result).toEqual({
      valid: false,
      reason: PlatformAssertionFailureReason.INVALID_PUBLIC_KEY,
    });
  });
});

describe('isValidPublicJwk', () => {
  const X_31_BYTES = Buffer.alloc(31, 1).toString('base64url');
  const X_33_BYTES = Buffer.alloc(33, 1).toString('base64url');
  const X_STANDARD_BASE64 = Buffer.alloc(32, 0xff)
    .toString('base64')
    .replace(/=+$/, '');
  // 43 characters decoding to 32 bytes, but the last one sets the 2 unused trailing bits.
  const X_NON_CANONICAL = `${'A'.repeat(42)}B`;

  it.each([
    { name: 'without alg and use', overrides: {} },
    {
      name: 'with alg EdDSA and use sig',
      overrides: { alg: 'EdDSA', use: 'sig' },
    },
    { name: 'with alg Ed25519', overrides: { alg: 'Ed25519' } },
  ])('should accept the JWK when it is valid $name', ({ overrides }) => {
    // Given
    const jwk = { ...publicJwk, ...overrides };

    // When
    const result = isValidPublicJwk(jwk);

    // Then
    expect(result).toBe(true);
  });

  it('should refuse the JWK when it carries a private part', () => {
    // Given
    const jwk = privateJwk;

    // When
    const result = isValidPublicJwk(jwk);

    // Then
    expect(result).toBe(false);
  });

  it.each([
    { name: 'kty is EC', overrides: { kty: 'EC' } },
    { name: 'crv is X25519', overrides: { crv: 'X25519' } },
    { name: 'x decodes to 31 bytes', overrides: { x: X_31_BYTES } },
    { name: 'x decodes to 33 bytes', overrides: { x: X_33_BYTES } },
    { name: 'x is padded', overrides: { x: `${X_31_BYTES}=` } },
    {
      name: 'x uses standard base64 characters',
      overrides: { x: X_STANDARD_BASE64 },
    },
    {
      name: 'x has non-canonical trailing bits',
      overrides: { x: X_NON_CANONICAL },
    },
    { name: 'x is missing', overrides: { x: undefined } },
    { name: 'kid is missing', overrides: { kid: undefined } },
    { name: 'kid is empty', overrides: { kid: '' } },
    {
      name: 'kid is longer than 255 characters',
      overrides: { kid: 'k'.repeat(256) },
    },
    { name: 'use is enc', overrides: { use: 'enc' } },
    { name: 'alg is RS256', overrides: { alg: 'RS256' } },
  ])('should refuse the JWK when $name', ({ overrides }) => {
    // Given
    const jwk = { ...publicJwk, ...overrides };

    // When
    const result = isValidPublicJwk(jwk);

    // Then
    expect(result).toBe(false);
  });

  it.each([null, 'a-public-key', [{ kty: 'OKP' }], 42])(
    'should refuse the JWK when it is not an object (%j)',
    (input) => {
      // Given
      const jwk: unknown = input;

      // When
      const result = isValidPublicJwk(jwk);

      // Then
      expect(result).toBe(false);
    }
  );
});

describe('verifyPlatformAssertion on assertions signed by the products', () => {
  it('should accept an OpenCTI assertion', async () => {
    // Given
    const { assertion, platformId, publicJwk: jwk, now } = OPENCTI_SAMPLE;

    // When
    const result = await verifyPlatformAssertion(assertion, {
      platformId,
      publicJwk: jwk,
      now,
    });

    // Then
    expect(result).toEqual({
      valid: true,
      claims: {
        iss: platformId,
        aud: PLATFORM_ASSERTION_AUDIENCE,
        iat: 1796983200,
        exp: 1796983260,
        jti: '4dc1bbf9-fb15-4b19-ba4f-d7865cfd90c0',
        identifier: 'opencti',
      },
    });
  });

  it('should return the htu of an OpenCTI download assertion as signed', async () => {
    // Given
    const {
      htuAssertion,
      htu,
      platformId,
      publicJwk: jwk,
      now,
    } = OPENCTI_SAMPLE;

    // When
    const result = await verifyPlatformAssertion(htuAssertion, {
      platformId,
      publicJwk: jwk,
      now,
    });

    // Then
    expect(result).toMatchObject({ valid: true, claims: { htu } });
  });

  // OpenAEV and XTM One still put the literal `typ: "JWT"` in the header instead of `"xtm-hub-platform+jwt"`. That
  // is their only mismatch: signature, kid, aud, iss, lifetime and jti all pass, and an OpenAEV tenant assertion is
  // an ordinary assertion with an extra tenant_id claim. Once the products send the protocol's typ, regenerate the
  // samples and expect them to be accepted.
  it.each([
    {
      name: 'an OpenAEV assertion for the whole instance',
      assertion: OPENAEV_SAMPLE.instanceAssertion,
      sample: OPENAEV_SAMPLE,
    },
    {
      name: 'an OpenAEV assertion for one tenant',
      assertion: OPENAEV_SAMPLE.tenantAssertion,
      sample: OPENAEV_SAMPLE,
    },
    {
      name: 'an XTM One assertion',
      assertion: XTM_ONE_SAMPLE.assertion,
      sample: XTM_ONE_SAMPLE,
    },
  ])(
    'should refuse $name: signed with typ "JWT" instead of "xtm-hub-platform+jwt"',
    async ({ assertion, sample }) => {
      // Given
      const { platformId, publicJwk: jwk, now } = sample;

      // When
      const result = await verifyPlatformAssertion(assertion, {
        platformId,
        publicJwk: jwk,
        now,
      });

      // Then
      expect(result).toEqual({
        valid: false,
        reason: PlatformAssertionFailureReason.INVALID_TYPE,
      });
    }
  );
});
