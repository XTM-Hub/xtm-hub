import {
  CompactSign,
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  type JWSHeaderParameters,
} from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../knexfile';
import { PlatformIdentifier } from '../../src/__generated__/resolvers-types';
import { OrganizationId } from '../../src/model/kanel/public/Organization';
import PlatformConfigurationModel from '../../src/model/kanel/public/PlatformConfiguration';
import { ServiceDefinitionId } from '../../src/model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../src/model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
} from '../../src/model/kanel/public/Subscription';
import {
  PLATFORM_ASSERTION_AUDIENCE,
  PLATFORM_ASSERTION_TYPE,
} from '../../src/modules/security-management/token/platform-assertion.util';
import { PLATFORM_ASSERTION_HEADER } from '../../src/modules/security-management/token/platform-authentication.util';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../src/modules/security-management/token/platform-token.util';
import { SERVICES, TEST_ORGANIZATIONS } from '../tests.const';
import { TestPlatformConfigurationHelper } from './test-platform-configuration.helper';
import { TestPlatformAssertionHelper } from './test.platform-assertion.helper';
import { TestServiceHelper } from './test.service.helper';

export interface TestPlatformCaller {
  organizationId: OrganizationId;
  serviceInstanceId: ServiceInstanceId;
  platformConfiguration: PlatformConfigurationModel;
  platformId: string;
  token: string;
  headers: Record<string, string>;
  cleanup: () => Promise<void>;
}

export interface TestKeyedPlatformCaller {
  organizationId: OrganizationId;
  serviceInstanceId: ServiceInstanceId;
  platformConfiguration: PlatformConfigurationModel;
  platformId: string;
  tenantId: string | null;
  kid: string;
  identifier: PlatformIdentifier;
  // Signs an assertion of this platform, valid for a minute from now unless the claims say otherwise.
  sign: (options?: {
    claims?: Record<string, unknown>;
    header?: Partial<JWSHeaderParameters>;
    key?: CryptoKey;
  }) => Promise<string>;
  cleanup: () => Promise<void>;
}

const IDENTIFIER_OF_SERVICE_DEFINITION: Record<string, PlatformIdentifier> = {
  [SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID]: PlatformIdentifier.Opencti,
  [SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID]: PlatformIdentifier.Openaev,
  [SERVICES.DEFINITIONS.XTMONE_REGISTRATION.ID]: PlatformIdentifier.Xtmone,
};

const ASSERTION_LIFETIME_SECONDS = 60;

const createRegistration = async ({
  overrides,
  organizationId,
  serviceDefinitionId,
}: {
  overrides: Partial<PlatformConfigurationModel>;
  organizationId: OrganizationId;
  serviceDefinitionId: ServiceDefinitionId;
}) => {
  const serviceInstance = await TestServiceHelper.serviceInstance.create({
    service_definition_id: serviceDefinitionId,
  });
  const platformConfiguration =
    await TestPlatformConfigurationHelper.platformConfiguration.create({
      service_instance_id: serviceInstance.id,
      platform_version: '7.260529.0',
      ...overrides,
    });
  await db<Subscription>('Subscription').insert({
    id: uuidv4() as SubscriptionId,
    service_instance_id: serviceInstance.id,
    organization_id: organizationId,
  });
  const cleanup = async () => {
    await db<Subscription>('Subscription')
      .where({ service_instance_id: serviceInstance.id })
      .del();
    await TestPlatformConfigurationHelper.platformConfiguration.delete({
      service_instance_id: serviceInstance.id,
    });
    await TestServiceHelper.serviceInstance.delete({
      id: serviceInstance.id,
    });
  };
  return {
    serviceInstanceId: serviceInstance.id,
    platformConfiguration,
    cleanup,
  };
};

export const TestPlatformCallerHelper = {
  platformCaller: {
    create: async ({
      platformConfiguration: overrides = {},
      organizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      serviceDefinitionId = SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
    }: {
      platformConfiguration?: Partial<PlatformConfigurationModel>;
      organizationId?: OrganizationId;
      serviceDefinitionId?: ServiceDefinitionId;
    } = {}): Promise<TestPlatformCaller> => {
      const { serviceInstanceId, platformConfiguration, cleanup } =
        await createRegistration({
          overrides,
          organizationId,
          serviceDefinitionId,
        });
      const { platform_id: platformId, token } = platformConfiguration;
      if (token === null) {
        throw new Error('A platform caller authenticates with a token');
      }

      return {
        organizationId,
        serviceInstanceId,
        platformConfiguration,
        platformId,
        token,
        headers: {
          [PLATFORM_ID_HEADER]: platformId,
          [PLATFORM_TOKEN_HEADER]: token,
        },
        cleanup,
      };
    },
  },
  // A registration that enrolled an Ed25519 key (its token revoked unless the overrides set one), and signs assertions
  keyedPlatformCaller: {
    create: async ({
      platformConfiguration: overrides = {},
      organizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      serviceDefinitionId = SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      kid = `key-${uuidv4()}`,
    }: {
      platformConfiguration?: Partial<PlatformConfigurationModel>;
      organizationId?: OrganizationId;
      serviceDefinitionId?: ServiceDefinitionId;
      kid?: string;
    } = {}): Promise<TestKeyedPlatformCaller> => {
      const identifier = IDENTIFIER_OF_SERVICE_DEFINITION[serviceDefinitionId];
      if (!identifier) {
        throw new Error('A keyed platform caller needs a registration service');
      }
      const { privateKey, publicKey } = await generateKeyPair('Ed25519', {
        extractable: true,
      });
      const publicJwk = {
        ...(await exportJWK(publicKey)),
        kid,
        alg: 'EdDSA',
        use: 'sig',
      };
      const { serviceInstanceId, platformConfiguration, cleanup } =
        await createRegistration({
          overrides: {
            token: null,
            public_key: JSON.stringify(publicJwk),
            public_key_id: kid,
            key_enrolled_at: new Date(),
            ...overrides,
          },
          organizationId,
          serviceDefinitionId,
        });
      const { platform_id: platformId, tenant_id: tenantId } =
        platformConfiguration;
      const signedJtis: string[] = [];

      const sign: TestKeyedPlatformCaller['sign'] = ({
        claims = {},
        header = {},
        key = privateKey,
      } = {}) => {
        const iat = Math.floor(Date.now() / 1000);
        const jti = uuidv4();
        signedJtis.push(jti);
        return new CompactSign(
          new TextEncoder().encode(
            JSON.stringify({
              iss: platformId,
              aud: PLATFORM_ASSERTION_AUDIENCE,
              iat,
              exp: iat + ASSERTION_LIFETIME_SECONDS,
              jti,
              identifier,
              ...(tenantId === null ? {} : { tenant_id: tenantId }),
              ...claims,
            })
          )
        )
          .setProtectedHeader({
            alg: 'EdDSA',
            typ: PLATFORM_ASSERTION_TYPE,
            kid,
            ...header,
          })
          .sign(key);
      };

      return {
        organizationId,
        serviceInstanceId,
        platformConfiguration,
        platformId,
        tenantId,
        kid,
        identifier,
        sign,
        cleanup: async () => {
          await TestPlatformAssertionHelper.platformAssertionJti.deleteAll(
            signedJtis
          );
          await cleanup();
        },
      };
    },
    assertionHeaders: (assertion: string): Record<string, string> => ({
      [PLATFORM_ASSERTION_HEADER]: assertion,
    }),
  },
};
