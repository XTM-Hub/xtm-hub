import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  contextSimpleUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  PlatformConfigurationStatus,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { UserId } from '../../../model/kanel/public/User';
import {
  PlatformConfigurationDomain,
  PlatformPublicKey,
} from './platform-configuration.domain';

const NON_UUID_CREDENTIALS = [
  {
    name: 'a platform id "x"',
    credentials: { platform_id: 'x', token: uuidv4() },
  },
  {
    name: 'a token "not-a-uuid"',
    credentials: { platform_id: uuidv4(), token: 'not-a-uuid' },
  },
  {
    name: 'an empty platform id',
    credentials: { platform_id: '', token: uuidv4() },
  },
  {
    name: 'a tenant id "not-a-uuid"',
    credentials: {
      platform_id: uuidv4(),
      token: uuidv4(),
      tenant_id: 'not-a-uuid',
    },
  },
];

const KEY_ID = 'enrolled-key-id';
const OTHER_KEY_ID = 'other-key-id';

const makePublicKey = (kid: string): PlatformPublicKey => ({
  kty: 'OKP',
  crv: 'Ed25519',
  x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
  kid,
  alg: 'EdDSA',
  use: 'sig',
});

describe('platformConfigurationDomain', () => {
  describe('isPlatformConfigurationValid', () => {
    it('returns true for valid platform configuration', async () => {
      const result =
        await PlatformConfigurationDomain.isPlatformConfigurationValid({
          registerer_id: contextSimpleUserSecondOrga.user.id,
          platform_id: uuidv4(),
          platform_url: 'http://example.com/',
          platform_title: 'Platform title',
          token: uuidv4(),
          platform_contract: 'EE',
          platform_version: '1.0.0',
          last_connectivity_check: new Date(),
        });

      expect(result).toBe(true);
    });

    it('returns false for invalid platform configuration', async () => {
      const result =
        await PlatformConfigurationDomain.isPlatformConfigurationValid({});

      expect(result).toBe(false);
    });

    it.each(['javascript:alert(1)', 'file:///etc/passwd', 'ftp://example.com'])(
      'returns false for the non-web platform url %s',
      async (platformUrl) => {
        const result =
          await PlatformConfigurationDomain.isPlatformConfigurationValid({
            registerer_id: contextSimpleUserSecondOrga.user.id,
            platform_id: uuidv4(),
            platform_url: platformUrl,
            platform_title: 'Platform title',
            token: uuidv4(),
            platform_contract: 'EE',
            platform_version: '1.0.0',
            last_connectivity_check: new Date(),
          });

        expect(result).toBe(false);
      }
    );
  });

  describe('countConfigurationsByRegisterer', () => {
    beforeAll(async () => {
      await TestHelper.platformConfiguration.delete({});
    });

    afterEach(async () => {
      await TestHelper.platformConfiguration.delete({});
    });

    it('should return 0 when the user registered no platform', async () => {
      const count =
        await PlatformConfigurationDomain.countConfigurationsByRegisterer(
          uuidv4() as UserId
        );

      expect(count).toBe(0);
    });

    it.each`
      status                                  | description
      ${PlatformConfigurationStatus.Active}   | ${'an active configuration'}
      ${PlatformConfigurationStatus.Inactive} | ${'an inactive configuration'}
    `(
      'should count $description registered by the user',
      async ({ status }) => {
        const registererId = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;
        await TestHelper.platformConfiguration.create({
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          status,
          registerer_id: registererId,
        });

        const count =
          await PlatformConfigurationDomain.countConfigurationsByRegisterer(
            registererId
          );

        expect(count).toBe(1);
      }
    );

    it('should not count configurations registered by another user', async () => {
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        registerer_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });

      const count =
        await PlatformConfigurationDomain.countConfigurationsByRegisterer(
          TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID
        );

      expect(count).toBe(0);
    });
  });

  describe('countConfigurationsByOrganization', () => {
    let serviceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      await TestHelper.platformConfiguration.delete({});
      const serviceInstance = await TestHelper.serviceInstance.create();
      serviceInstanceId = serviceInstance.id;
    });

    afterEach(async () => {
      await TestHelper.platformConfiguration.delete({});
      await TestHelper.subscription.delete({
        service_instance_id: serviceInstanceId,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
    });

    it('should return 0 when the organization has no connected product', async () => {
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
      });

      const count =
        await PlatformConfigurationDomain.countConfigurationsByOrganization(
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );

      expect(count).toBe(0);
    });

    it.each`
      status                                  | description
      ${PlatformConfigurationStatus.Active}   | ${'an active configuration'}
      ${PlatformConfigurationStatus.Inactive} | ${'an inactive configuration'}
    `(
      'should count $description linked through a subscription',
      async ({ status }) => {
        await TestHelper.platformConfiguration.create({
          service_instance_id: serviceInstanceId,
          status,
        });
        await TestHelper.subscription.create({
          service_instance_id: serviceInstanceId,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        });

        const count =
          await PlatformConfigurationDomain.countConfigurationsByOrganization(
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
          );

        expect(count).toBe(1);
      }
    );

    it('should not count a configuration subscribed by another organization', async () => {
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
      });
      await TestHelper.subscription.create({
        service_instance_id: serviceInstanceId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      const count =
        await PlatformConfigurationDomain.countConfigurationsByOrganization(
          TEST_ORGANIZATIONS.FILIGRAN.ID
        );

      expect(count).toBe(0);
    });
  });

  describe('loadConfigurationByPlatformAndToken', () => {
    const platformId = uuidv4();
    const token = uuidv4();

    beforeEach(async () => {
      await TestHelper.platformConfiguration.delete({});
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        token,
      });
    });

    it('loads by platform and token', async () => {
      const configuration =
        await PlatformConfigurationDomain.loadConfigurationByPlatformAndToken({
          platform_id: platformId,
          token,
        });

      expect(configuration).toMatchObject({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        platform_id: platformId,
        token,
      });
    });

    it.each(NON_UUID_CREDENTIALS)(
      'should return undefined when given $name',
      async ({ credentials }) => {
        // When
        const call =
          PlatformConfigurationDomain.loadConfigurationByPlatformAndToken(
            credentials
          );

        // Then
        await expect(call).resolves.toBeUndefined();
      }
    );

    it('should return undefined when the tenant id is empty, even for a matching platform and token', async () => {
      // When
      const call =
        PlatformConfigurationDomain.loadConfigurationByPlatformAndToken({
          platform_id: platformId,
          token,
          tenant_id: '',
        });

      // Then
      await expect(call).resolves.toBeUndefined();
    });
  });

  describe('loadConfigurationByPlatform', () => {
    const platformId = uuidv4();

    beforeEach(async () => {
      await TestHelper.platformConfiguration.delete({});
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        token: uuidv4(),
      });
    });

    it('loads by platform id', async () => {
      const configuration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId
        );
      expect(configuration?.platform_id).toBe(platformId);
    });
  });

  describe('loadActiveConfigurationsByPlatformExcludingTenants', () => {
    const platformId = uuidv4();
    const tenantAId = uuidv4();
    const tenantBId = uuidv4();

    beforeEach(async () => {
      await TestHelper.platformConfiguration.delete({});
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        tenant_id: tenantAId,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        tenant_id: tenantBId,
      });
    });

    it('excludes requested tenants', async () => {
      const configurations =
        await PlatformConfigurationDomain.loadActiveConfigurationsByPlatformExcludingTenants(
          platformId,
          [tenantAId]
        );

      expect(configurations).toHaveLength(1);
      expect(configurations[0]?.tenant_id).toBe(tenantBId);
    });
  });

  describe('loadResolvedConfigurationByPlatform', () => {
    let platformId: string;
    let serviceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      platformId = uuidv4();
      serviceInstanceId = uuidv4() as ServiceInstanceId;
    });

    afterEach(async () => {
      await TestHelper.platformConfiguration.delete({
        service_instance_id: serviceInstanceId,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
    });

    it('should return undefined when no configuration matches the platformId', async () => {
      const resolved =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
          uuidv4()
        );

      expect(resolved).toBeUndefined();
    });

    it('should return resolved configuration with joined definition and mapped identifier', async () => {
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      const { token } = await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        token: uuidv4(),
      });

      const resolved =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
          platformId
        );

      expect(resolved).toBeDefined();
      expect(resolved?.platformConfiguration).toMatchObject({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        token,
      });
      expect(resolved?.serviceDefinition?.id).toBe(
        SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID
      );
      expect(resolved?.serviceDefinition?.identifier).toBe(
        ServiceDefinitionIdentifier.OpenctiRegistration
      );
      expect(resolved?.platformIdentifier).toBe(PlatformIdentifier.Opencti);
    });

    it('should filter by status when status option is provided', async () => {
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Inactive,
        platform_id: platformId,
      });

      const resolvedInactive =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
          platformId,
          { status: PlatformConfigurationStatus.Inactive }
        );
      const resolvedActive =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
          platformId,
          { status: PlatformConfigurationStatus.Active }
        );

      expect(resolvedInactive).toBeDefined();
      expect(resolvedActive).toBeUndefined();
    });

    it('should filter by tenantId when tenantId option is provided', async () => {
      const tenantId = uuidv4();
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        tenant_id: tenantId,
      });

      const resolvedWithTenant =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
          platformId,
          { tenantId }
        );
      const resolvedWithOtherTenant =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
          platformId,
          { tenantId: uuidv4() }
        );

      expect(resolvedWithTenant?.platformConfiguration.tenant_id).toBe(
        tenantId
      );
      expect(resolvedWithOtherTenant).toBeUndefined();
    });
  });

  describe('loadResolvedConfigurationByPlatformAndToken', () => {
    let platformId: string;
    let token: string;
    let serviceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      platformId = uuidv4();
      token = uuidv4();
      serviceInstanceId = uuidv4() as ServiceInstanceId;
    });

    afterEach(async () => {
      await TestHelper.platformConfiguration.delete({
        service_instance_id: serviceInstanceId,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
    });

    it('should return resolved configuration when platformId and token match', async () => {
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        token,
      });

      const resolved =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
          { platform_id: platformId, token }
        );

      expect(resolved).toBeDefined();
      expect(resolved?.platformConfiguration.service_instance_id).toBe(
        serviceInstanceId
      );
      expect(resolved?.serviceDefinition?.identifier).toBe(
        ServiceDefinitionIdentifier.OpenaevRegistration
      );
      expect(resolved?.platformIdentifier).toBe(PlatformIdentifier.Openaev);
    });

    it('should return undefined when token does not match', async () => {
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        token,
      });

      const resolved =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
          { platform_id: platformId, token: uuidv4() }
        );

      expect(resolved).toBeUndefined();
    });

    it('should return undefined when withoutTenantId is true and config has a tenant_id', async () => {
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        token,
        tenant_id: uuidv4(),
      });

      const resolved =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
          { platform_id: platformId, token, withoutTenantId: true }
        );

      expect(resolved).toBeUndefined();
    });

    it('should filter by tenant_id when provided', async () => {
      const tenantId = uuidv4();
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        token,
        tenant_id: tenantId,
      });

      const resolvedMatching =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
          { platform_id: platformId, token, tenant_id: tenantId }
        );
      const resolvedMismatch =
        await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
          { platform_id: platformId, token, tenant_id: uuidv4() }
        );

      expect(resolvedMatching?.platformConfiguration.tenant_id).toBe(tenantId);
      expect(resolvedMismatch).toBeUndefined();
    });

    it.each(NON_UUID_CREDENTIALS)(
      'should return undefined when given $name',
      async ({ credentials }) => {
        // When
        const call =
          PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
            credentials
          );

        // Then
        await expect(call).resolves.toBeUndefined();
      }
    );
  });

  describe('loadConfigurationByPlatformAndKeyId', () => {
    const platformId = uuidv4();
    const tenantId = uuidv4();

    beforeEach(async () => {
      await TestHelper.platformConfiguration.delete({});
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        platform_id: platformId,
        tenant_id: null,
        token: null,
        public_key: makePublicKey(KEY_ID),
        public_key_id: KEY_ID,
        key_enrolled_at: new Date(),
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        platform_id: platformId,
        tenant_id: tenantId,
        token: null,
        public_key: makePublicKey(KEY_ID),
        public_key_id: KEY_ID,
        key_enrolled_at: new Date(),
      });
    });

    afterEach(async () => {
      await TestHelper.platformConfiguration.delete({});
    });

    it.each([
      {
        name: 'the instance',
        tenant_id: null,
        serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
      },
      {
        name: 'the tenant',
        tenant_id: tenantId,
        serviceInstanceId: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
      },
    ])(
      'should load the registration of $name enrolled with the key id',
      async ({ tenant_id, serviceInstanceId }) => {
        // When
        const configuration =
          await PlatformConfigurationDomain.loadConfigurationByPlatformAndKeyId(
            { platform_id: platformId, tenant_id, public_key_id: KEY_ID }
          );

        // Then
        expect(configuration?.service_instance_id).toBe(serviceInstanceId);
      }
    );

    it.each([
      {
        name: 'another key id',
        lookup: { platform_id: platformId, public_key_id: OTHER_KEY_ID },
      },
      {
        name: 'another platform',
        lookup: { platform_id: uuidv4(), public_key_id: KEY_ID },
      },
      {
        name: 'another tenant',
        lookup: {
          platform_id: platformId,
          tenant_id: uuidv4(),
          public_key_id: KEY_ID,
        },
      },
      {
        name: 'a platform id "x"',
        lookup: { platform_id: 'x', public_key_id: KEY_ID },
      },
      {
        name: 'a tenant id "not-a-uuid"',
        lookup: {
          platform_id: platformId,
          tenant_id: 'not-a-uuid',
          public_key_id: KEY_ID,
        },
      },
    ])('should return undefined when given $name', async ({ lookup }) => {
      // When
      const configuration =
        await PlatformConfigurationDomain.loadConfigurationByPlatformAndKeyId({
          tenant_id: null,
          ...lookup,
        });

      // Then
      expect(configuration).toBeUndefined();
    });
  });

  describe('enrollKey', () => {
    const platformId = uuidv4();
    const tenantId = uuidv4();
    const token = uuidv4();

    beforeEach(async () => {
      await TestHelper.platformConfiguration.delete({});
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        platform_id: platformId,
        tenant_id: tenantId,
        token,
      });
    });

    afterEach(async () => {
      await TestHelper.platformConfiguration.delete({});
    });

    it('should store the key and revoke the token when the credentials match', async () => {
      // When
      await PlatformConfigurationDomain.enrollKey({
        platform_id: platformId,
        tenant_id: tenantId,
        token,
        publicKey: makePublicKey(KEY_ID),
      });

      // Then
      const configuration = await TestHelper.platformConfiguration.load({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      expect(configuration).toMatchObject({
        token: null,
        public_key: makePublicKey(KEY_ID),
        public_key_id: KEY_ID,
        key_enrolled_at: expect.any(Date),
      });
    });

    it('should no longer authenticate the revoked token when the key is enrolled', async () => {
      // Given
      await PlatformConfigurationDomain.enrollKey({
        platform_id: platformId,
        tenant_id: tenantId,
        token,
        publicKey: makePublicKey(KEY_ID),
      });

      // When
      const configuration =
        await PlatformConfigurationDomain.loadConfigurationByPlatformAndToken({
          platform_id: platformId,
          tenant_id: tenantId,
          token,
        });

      // Then
      expect(configuration).toBeUndefined();
    });

    it.each([
      {
        name: 'another token',
        credentials: {
          platform_id: platformId,
          tenant_id: tenantId,
          token: uuidv4(),
        },
      },
      {
        name: 'another platform',
        credentials: { platform_id: uuidv4(), tenant_id: tenantId, token },
      },
      {
        name: 'another tenant',
        credentials: { platform_id: platformId, tenant_id: uuidv4(), token },
      },
      {
        name: 'no tenant for a tenant registration',
        credentials: { platform_id: platformId, tenant_id: null, token },
      },
      {
        name: 'a token "not-a-uuid"',
        credentials: {
          platform_id: platformId,
          tenant_id: tenantId,
          token: 'not-a-uuid',
        },
      },
    ])('should enroll nothing when given $name', async ({ credentials }) => {
      // When
      const enrolled = await PlatformConfigurationDomain.enrollKey({
        ...credentials,
        publicKey: makePublicKey(KEY_ID),
      });

      // Then
      expect(enrolled).toBeUndefined();
    });

    it('should keep the first key when two keys are enrolled at once with the same token', async () => {
      // When
      const results = await Promise.all([
        PlatformConfigurationDomain.enrollKey({
          platform_id: platformId,
          tenant_id: tenantId,
          token,
          publicKey: makePublicKey(KEY_ID),
        }),
        PlatformConfigurationDomain.enrollKey({
          platform_id: platformId,
          tenant_id: tenantId,
          token,
          publicKey: makePublicKey(OTHER_KEY_ID),
        }),
      ]);

      // Then
      const winners = results.filter((enrolled) => enrolled !== undefined);
      const configuration = await TestHelper.platformConfiguration.load({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      expect(winners.map(({ public_key_id }) => public_key_id)).toEqual([
        configuration?.public_key_id,
      ]);
    });
  });
});
