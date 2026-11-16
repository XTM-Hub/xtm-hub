import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { SERVICES } from '../../../../tests/tests.const';
import { isUuid } from '../../../utils/uuid.util';

const MIGRATION = '20261124120000_add_platform_key_pair';
const SERVICE_INSTANCE_ID = SERVICES.INSTANCES.INTEGRATIONS.ID;
const PUBLIC_KEY = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
  kid: 'test-key-id',
  alg: 'EdDSA',
  use: 'sig',
};

const loadKeyPairSchema = async () => ({
  publicKey: await TestHelper.migration.hasColumn(
    'PlatformConfiguration',
    'public_key'
  ),
  publicKeyId: await TestHelper.migration.hasColumn(
    'PlatformConfiguration',
    'public_key_id'
  ),
  keyEnrolledAt: await TestHelper.migration.hasColumn(
    'PlatformConfiguration',
    'key_enrolled_at'
  ),
  platformTokenConsumedAt: await TestHelper.migration.hasColumn(
    'DeploymentRequest',
    'platform_token_consumed_at'
  ),
  assertionJtiTable: await TestHelper.migration.hasTable(
    'PlatformAssertionJti'
  ),
});

describe('add_platform_key_pair migration', () => {
  afterEach(async () => {
    await TestHelper.platformConfiguration.delete({
      service_instance_id: SERVICE_INSTANCE_ID,
    });
    // Leave the schema as the other suites expect it, even when a test failed after rolling back.
    if (!(await TestHelper.migration.hasTable('PlatformAssertionJti'))) {
      await TestHelper.migration.run(MIGRATION, 'up');
    }
  });

  describe('down', () => {
    it('should remove the key pair columns and the assertion id table', async () => {
      // When
      await TestHelper.migration.run(MIGRATION, 'down');

      // Then
      expect(await loadKeyPairSchema()).toEqual({
        publicKey: false,
        publicKeyId: false,
        keyEnrolledAt: false,
        platformTokenConsumedAt: false,
        assertionJtiTable: false,
      });
    });

    it('should give a new token to a registration that only has a key', async () => {
      // Given
      await TestHelper.platformConfiguration.create({
        service_instance_id: SERVICE_INSTANCE_ID,
        token: null,
        public_key: PUBLIC_KEY,
        public_key_id: PUBLIC_KEY.kid,
        key_enrolled_at: new Date(),
      });

      // When
      await TestHelper.migration.run(MIGRATION, 'down');

      // Then
      const configuration = await TestHelper.platformConfiguration.load({
        service_instance_id: SERVICE_INSTANCE_ID,
      });
      expect(isUuid(configuration?.token ?? '')).toBe(true);
    });
  });

  describe('up', () => {
    it('should restore the key pair columns and the assertion id table after a rollback', async () => {
      // Given
      await TestHelper.migration.run(MIGRATION, 'down');

      // When
      await TestHelper.migration.run(MIGRATION, 'up');

      // Then
      expect(await loadKeyPairSchema()).toEqual({
        publicKey: true,
        publicKeyId: true,
        keyEnrolledAt: true,
        platformTokenConsumedAt: true,
        assertionJtiTable: true,
      });
    });

    it.each([
      {
        name: 'neither a token nor a key',
        credentials: { token: null },
      },
      {
        name: 'a key without its key id',
        credentials: {
          public_key: PUBLIC_KEY,
          key_enrolled_at: new Date(),
        },
      },
      {
        name: 'a key without its enrollment date',
        credentials: {
          public_key: PUBLIC_KEY,
          public_key_id: PUBLIC_KEY.kid,
        },
      },
    ])('should refuse a registration with $name', async ({ credentials }) => {
      // When
      const creation = TestHelper.platformConfiguration.create({
        service_instance_id: SERVICE_INSTANCE_ID,
        ...credentials,
      });

      // Then
      await expect(creation).rejects.toThrow(/violates check constraint/);
    });
  });
});
