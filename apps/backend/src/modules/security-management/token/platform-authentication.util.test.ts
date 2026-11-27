import { type CryptoKey, generateKeyPair } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import {
  PlatformConfigurationStatus,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import { logApp } from '../../../utils/app-logger.util';
import { UnauthenticatedErrorCode } from '../../../utils/error/error.code';
import {
  authenticatePlatform,
  PLATFORM_ASSERTION_HEADER,
  PlatformAuthenticationOptions,
} from './platform-authentication.util';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from './platform-token.util';

type Caller = Awaited<ReturnType<typeof TestHelper.keyedPlatformCaller.create>>;

const DOCUMENT_PATH = `/document/get/${uuidv4()}/${uuidv4()}`;
const OTHER_DOCUMENT_PATH = `/document/get/${uuidv4()}/${uuidv4()}`;
const NOW_SECONDS = () => Math.floor(Date.now() / 1000);

const cleanups: (() => Promise<void>)[] = [];
const track = <T extends { cleanup: () => Promise<void> }>(caller: T): T => {
  cleanups.push(caller.cleanup);
  return caller;
};

const keyedCaller = (
  options: Parameters<typeof TestHelper.keyedPlatformCaller.create>[0] = {}
) => TestHelper.keyedPlatformCaller.create(options).then(track);

const tokenCaller = (
  options: Parameters<typeof TestHelper.platformCaller.create>[0] = {}
) => TestHelper.platformCaller.create(options).then(track);

const requestWith = (headers: Record<string, string>) => ({ headers });

const assertionRequest = (assertion: string) =>
  requestWith(TestHelper.keyedPlatformCaller.assertionHeaders(assertion));

let otherPrivateKey: CryptoKey;

beforeAll(async () => {
  ({ privateKey: otherPrivateKey } = await generateKeyPair('Ed25519'));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe('authenticatePlatform with a token', () => {
  it('should return the registration that matches the platform id and token headers', async () => {
    // Given
    const caller = await tokenCaller();

    // When
    const authentication = await authenticatePlatform(
      requestWith(caller.headers)
    );

    // Then
    expect(authentication).toMatchObject({
      outcome: 'token',
      method: 'token',
      platformId: caller.platformId,
      token: caller.token,
      match: {
        credential: 'registration',
        platformId: caller.platformId,
        organization: { id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID },
      },
    });
  });

  it('should read the platform id and token of the operation when the headers do not carry them', async () => {
    // Given
    const caller = await tokenCaller();

    // When
    const authentication = await authenticatePlatform(requestWith({}), {
      input: { platformId: caller.platformId, token: caller.token },
    });

    // Then
    expect(authentication).toMatchObject({
      outcome: 'token',
      match: { credential: 'registration', platformId: caller.platformId },
    });
  });

  it('should not complete a token header with the platform id of the operation', async () => {
    // Given
    const caller = await tokenCaller();

    // When
    const authentication = await authenticatePlatform(
      requestWith({ [PLATFORM_TOKEN_HEADER]: caller.token }),
      { input: { platformId: caller.platformId } }
    );

    // Then
    expect(authentication).toEqual({ outcome: 'missing' });
  });

  it.each([
    { label: 'no header', headers: {} },
    {
      label: 'only the platform id header',
      headers: { [PLATFORM_ID_HEADER]: uuidv4() },
    },
    {
      label: 'an empty token header',
      headers: { [PLATFORM_ID_HEADER]: uuidv4(), [PLATFORM_TOKEN_HEADER]: '' },
    },
  ])(
    'should answer missing when the request has $label',
    async ({ headers }) => {
      // When
      const authentication = await authenticatePlatform(requestWith(headers));

      // Then
      expect(authentication).toEqual({ outcome: 'missing' });
    }
  );

  it('should let the caller judge a token that matches nothing', async () => {
    // Given
    const platformId = uuidv4();
    const token = uuidv4();

    // When
    const authentication = await authenticatePlatform(
      requestWith({
        [PLATFORM_ID_HEADER]: platformId,
        [PLATFORM_TOKEN_HEADER]: token,
      })
    );

    // Then
    expect(authentication).toEqual({
      outcome: 'token',
      method: 'token',
      platformId,
      token,
      match: undefined,
    });
  });

  it('should refuse the token of a registration that enrolled a key', async () => {
    // Given
    const token = uuidv4();
    const caller = await keyedCaller({ platformConfiguration: { token } });

    // When
    const authentication = await authenticatePlatform(
      requestWith({
        [PLATFORM_ID_HEADER]: caller.platformId,
        [PLATFORM_TOKEN_HEADER]: token,
      })
    );

    // Then
    expect(authentication).toEqual({
      outcome: 'refused',
      method: 'token',
      code: UnauthenticatedErrorCode.PlatformTokenRefused,
    });
  });

  it('should refuse a revoked token of a platform whose active registration enrolled a key', async () => {
    // Given
    const caller = await keyedCaller();

    // When
    const authentication = await authenticatePlatform(
      requestWith({
        [PLATFORM_ID_HEADER]: caller.platformId,
        [PLATFORM_TOKEN_HEADER]: uuidv4(),
      })
    );

    // Then
    expect(authentication).toEqual({
      outcome: 'refused',
      method: 'token',
      code: UnauthenticatedErrorCode.PlatformTokenRefused,
    });
  });

  it('should accept the token of an OpenAEV tenant still on its token when another tenant of the instance enrolled a key', async () => {
    // Given
    const platformId = uuidv4();
    await keyedCaller({
      serviceDefinitionId: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
      platformConfiguration: { platform_id: platformId, tenant_id: uuidv4() },
    });
    const tenantOnToken = await tokenCaller({
      serviceDefinitionId: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
      platformConfiguration: { platform_id: platformId, tenant_id: uuidv4() },
    });

    // When
    const authentication = await authenticatePlatform(
      requestWith(tenantOnToken.headers)
    );

    // Then
    expect(authentication).toMatchObject({
      outcome: 'token',
      match: {
        credential: 'registration',
        registration: {
          platformConfiguration: {
            service_instance_id: tenantOnToken.serviceInstanceId,
          },
        },
      },
    });
  });
});

describe('authenticatePlatform with an assertion', () => {
  it('should authenticate the registration of the key and consume the jti of the assertion', async () => {
    // Given
    const caller = await keyedCaller();
    const jti = uuidv4();
    const assertion = await caller.sign({ claims: { jti } });

    // When
    const authentication = await authenticatePlatform(
      assertionRequest(assertion)
    );

    // Then
    expect(authentication).toMatchObject({
      outcome: 'authenticated',
      method: 'assertion',
      match: {
        credential: 'registration',
        platformId: caller.platformId,
        organization: { id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID },
        registration: {
          platformIdentifier: PlatformIdentifier.Opencti,
          platformConfiguration: {
            service_instance_id: caller.serviceInstanceId,
          },
        },
      },
      claims: { iss: caller.platformId, jti },
    });
    expect(await TestHelper.platformAssertionJti.loadAll([jti])).toMatchObject([
      { jti },
    ]);
    await TestHelper.platformAssertionJti.deleteAll([jti]);
  });

  it.each([
    PlatformIdentifier.Opencti,
    PlatformIdentifier.Openaev,
    PlatformIdentifier.Xtmone,
  ])(
    'should authenticate an assertion of a %s registration',
    async (identifier) => {
      // Given
      const serviceDefinitionId = {
        [PlatformIdentifier.Opencti]:
          SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
        [PlatformIdentifier.Openaev]:
          SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
        [PlatformIdentifier.Xtmone]:
          SERVICES.DEFINITIONS.XTMONE_REGISTRATION.ID,
      }[identifier];
      const tenantId =
        identifier === PlatformIdentifier.Openaev ? uuidv4() : null;
      const caller = await keyedCaller({
        serviceDefinitionId,
        platformConfiguration: { tenant_id: tenantId },
      });

      // When
      const authentication = await authenticatePlatform(
        assertionRequest(await caller.sign())
      );

      // Then
      expect(authentication).toMatchObject({
        outcome: 'authenticated',
        match: { registration: { platformIdentifier: identifier } },
      });
    }
  );

  it('should refuse an assertion sent a second time', async () => {
    // Given
    const caller = await keyedCaller();
    const assertion = await caller.sign();
    await authenticatePlatform(assertionRequest(assertion));

    // When
    const replay = await authenticatePlatform(assertionRequest(assertion));

    // Then
    expect(replay).toEqual({
      outcome: 'refused',
      method: 'assertion',
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    });
  });

  it('should authenticate every check of the same request with its single assertion', async () => {
    // Given
    const caller = await keyedCaller();
    const req = assertionRequest(await caller.sign());
    await authenticatePlatform(req);

    // When
    const secondCheck = await authenticatePlatform(req, {
      input: { platformId: caller.platformId },
    });

    // Then
    expect(secondCheck).toMatchObject({
      outcome: 'authenticated',
      match: { platformId: caller.platformId },
    });
  });

  it('should refuse the platform id one field names in a request whose other field was authenticated', async () => {
    // Given
    const caller = await keyedCaller();
    const req = assertionRequest(await caller.sign());
    await authenticatePlatform(req);

    // When
    const otherField = await authenticatePlatform(req, {
      input: { platformId: uuidv4() },
    });

    // Then
    expect(otherField).toEqual({
      outcome: 'refused',
      method: 'assertion',
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    });
  });

  it('should refuse a failed assertion even when a valid token comes with it', async () => {
    // Given
    const tokenPlatform = await tokenCaller();

    // When
    const authentication = await authenticatePlatform(
      requestWith({
        ...tokenPlatform.headers,
        [PLATFORM_ASSERTION_HEADER]: 'not-an-assertion',
      })
    );

    // Then
    expect(authentication).toEqual({
      outcome: 'refused',
      method: 'assertion',
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    });
  });

  type RefusalCase = {
    label: string;
    sign: (caller: Caller) => Promise<string>;
    options?: (caller: Caller) => PlatformAuthenticationOptions;
    headers?: (caller: Caller) => Record<string, string>;
    code: UnauthenticatedErrorCode;
  };

  it.each<RefusalCase>([
    {
      label: 'it names another product',
      sign: (caller) =>
        caller.sign({ claims: { identifier: PlatformIdentifier.Xtmone } }),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
    {
      label: 'it names no product',
      sign: (caller) => caller.sign({ claims: { identifier: undefined } }),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
    {
      label: 'its key id is unknown',
      sign: (caller) => caller.sign({ header: { kid: 'unknown-key-id' } }),
      code: UnauthenticatedErrorCode.PlatformKeyMismatch,
    },
    {
      label: 'another key signed it',
      sign: (caller) => caller.sign({ key: otherPrivateKey }),
      code: UnauthenticatedErrorCode.PlatformKeyMismatch,
    },
    {
      label: 'it has expired',
      sign: (caller) =>
        caller.sign({
          claims: { iat: NOW_SECONDS() - 600, exp: NOW_SECONDS() - 540 },
        }),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
    {
      label: 'its issuer is another platform',
      sign: (caller) => caller.sign({ claims: { iss: uuidv4() } }),
      code: UnauthenticatedErrorCode.PlatformKeyMismatch,
    },
    {
      label: 'the operation names another platform id',
      sign: (caller) => caller.sign(),
      options: () => ({ input: { platformId: uuidv4() } }),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
    {
      label: 'the platform id header names another platform',
      sign: (caller) => caller.sign(),
      headers: () => ({ [PLATFORM_ID_HEADER]: uuidv4() }),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
    {
      label: 'it is signed for another document',
      sign: (caller) => caller.sign({ claims: { htu: OTHER_DOCUMENT_PATH } }),
      options: () => ({ htu: DOCUMENT_PATH }),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
    {
      label: 'it is signed for no document when the request reads one',
      sign: (caller) => caller.sign(),
      options: () => ({ htu: DOCUMENT_PATH }),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
    {
      label: 'it is not a signed assertion',
      sign: () => Promise.resolve('not-an-assertion'),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
    {
      label: 'it is empty',
      sign: () => Promise.resolve(''),
      code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
    },
  ])(
    'should refuse an assertion with $code when $label',
    async ({ sign, options, headers, code }) => {
      // Given
      const caller = await keyedCaller();
      const req = requestWith({
        ...headers?.(caller),
        [PLATFORM_ASSERTION_HEADER]: await sign(caller),
      });

      // When
      const authentication = await authenticatePlatform(req, options?.(caller));

      // Then
      expect(authentication).toEqual({
        outcome: 'refused',
        method: 'assertion',
        code,
      });
    }
  );

  it('should authenticate an assertion signed for the document the request reads', async () => {
    // Given
    const caller = await keyedCaller();
    const assertion = await caller.sign({ claims: { htu: DOCUMENT_PATH } });

    // When
    const authentication = await authenticatePlatform(
      assertionRequest(assertion),
      { htu: DOCUMENT_PATH }
    );

    // Then
    expect(authentication).toMatchObject({
      outcome: 'authenticated',
      claims: { htu: DOCUMENT_PATH },
    });
  });

  it('should refuse the assertion of an unregistered platform', async () => {
    // Given
    const caller = await keyedCaller({
      platformConfiguration: { status: PlatformConfigurationStatus.Inactive },
    });

    // When
    const authentication = await authenticatePlatform(
      assertionRequest(await caller.sign())
    );

    // Then
    expect(authentication).toEqual({
      outcome: 'refused',
      method: 'assertion',
      code: UnauthenticatedErrorCode.PlatformKeyMismatch,
    });
  });

  it('should keep the jti of a refused assertion so the platform can still send it', async () => {
    // Given
    const caller = await keyedCaller({
      platformConfiguration: { status: PlatformConfigurationStatus.Inactive },
    });
    const jti = uuidv4();
    await authenticatePlatform(
      assertionRequest(await caller.sign({ claims: { jti } }))
    );

    // When
    const consumed = await TestHelper.platformAssertionJti.loadAll([jti]);

    // Then
    expect(consumed).toEqual([]);
  });

  describe('of an OpenAEV tenant', () => {
    const openaevCaller = (platformId: string, tenantId: string | null) =>
      keyedCaller({
        serviceDefinitionId: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
        platformConfiguration: { platform_id: platformId, tenant_id: tenantId },
      });

    it('should authenticate the registration of the tenant it names', async () => {
      // Given
      const platformId = uuidv4();
      const tenant = await openaevCaller(platformId, uuidv4());
      await openaevCaller(platformId, uuidv4());

      // When
      const authentication = await authenticatePlatform(
        assertionRequest(await tenant.sign())
      );

      // Then
      expect(authentication).toMatchObject({
        outcome: 'authenticated',
        match: {
          registration: {
            platformConfiguration: { tenant_id: tenant.tenantId },
          },
        },
      });
    });

    it('should refuse an assertion of one tenant that names another tenant of the instance', async () => {
      // Given
      const platformId = uuidv4();
      const tenant = await openaevCaller(platformId, uuidv4());
      const otherTenant = await openaevCaller(platformId, uuidv4());

      // When
      const authentication = await authenticatePlatform(
        assertionRequest(
          await tenant.sign({ claims: { tenant_id: otherTenant.tenantId } })
        )
      );

      // Then
      expect(authentication).toEqual({
        outcome: 'refused',
        method: 'assertion',
        code: UnauthenticatedErrorCode.PlatformKeyMismatch,
      });
    });

    it('should refuse an assertion of one tenant signed under the key id of another tenant', async () => {
      // Given
      const platformId = uuidv4();
      const tenant = await openaevCaller(platformId, uuidv4());
      const otherTenant = await openaevCaller(platformId, uuidv4());

      // When
      const authentication = await authenticatePlatform(
        assertionRequest(
          await tenant.sign({
            header: { kid: otherTenant.kid },
            claims: { tenant_id: otherTenant.tenantId },
          })
        )
      );

      // Then
      expect(authentication).toEqual({
        outcome: 'refused',
        method: 'assertion',
        code: UnauthenticatedErrorCode.PlatformKeyMismatch,
      });
    });

    it('should refuse an OpenAEV assertion without tenant', async () => {
      // Given
      const caller = await openaevCaller(uuidv4(), null);

      // When
      const authentication = await authenticatePlatform(
        assertionRequest(await caller.sign())
      );

      // Then
      expect(authentication).toEqual({
        outcome: 'refused',
        method: 'assertion',
        code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
      });
    });

    it('should refuse an assertion of a tenant registration that leaves its tenant out', async () => {
      // Given
      const caller = await openaevCaller(uuidv4(), uuidv4());

      // When
      const authentication = await authenticatePlatform(
        assertionRequest(
          await caller.sign({ claims: { tenant_id: undefined } })
        )
      );

      // Then
      expect(authentication).toEqual({
        outcome: 'refused',
        method: 'assertion',
        code: UnauthenticatedErrorCode.PlatformKeyMismatch,
      });
    });
  });

  it('should log the refusal with its reason but never the assertion nor the token', async () => {
    // Given
    const logWarn = vi
      .spyOn(logApp, 'warn')
      .mockImplementation(() => undefined);
    const caller = await keyedCaller();
    const token = uuidv4();
    const assertion = await caller.sign({ key: otherPrivateKey });

    // When
    await authenticatePlatform(
      requestWith({
        [PLATFORM_ASSERTION_HEADER]: assertion,
        [PLATFORM_TOKEN_HEADER]: token,
      })
    );

    // Then
    expect(logWarn).toHaveBeenCalledWith('Platform authentication refused', {
      method: 'assertion',
      platformId: caller.platformId,
      code: UnauthenticatedErrorCode.PlatformKeyMismatch,
      reason: 'INVALID_SIGNATURE',
    });
    const logged = JSON.stringify(logWarn.mock.calls);
    expect(logged).not.toContain(assertion.split('.')[2]);
    expect(logged).not.toContain(token);
  });
});
