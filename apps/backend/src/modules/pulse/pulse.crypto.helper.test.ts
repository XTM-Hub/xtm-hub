import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PulseObjectType } from '../../__generated__/resolvers-types';
import { PulseCrypto } from './pulse.crypto.helper';

const SALT_A = Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex');
const SALT_B = Buffer.from('f0e0d0c0b0a090807060504030201000', 'hex');
const AT_REST_SECRET = Buffer.from(
  'a7e5d3c1b9f7e5d3c1b9f7e5d3c1b9f7a7e5d3c1b9f7e5d3c1b9f7e5d3c1b9f7',
  'hex'
);
const OTHER_AT_REST_SECRET = Buffer.from(
  '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  'hex'
);
const PLATFORM_SECRET = Buffer.from(
  '5f3d1b9f7e5d3c1b9f7e5d3c1b9f7e5d5f3d1b9f7e5d3c1b9f7e5d3c1b9f7e5d',
  'hex'
);
const PLATFORM_ID = '2b4f5c1e-9a3d-4f7b-8c6e-1d2e3f4a5b6c';
const OTHER_PLATFORM_ID = '7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f';

// Test vectors of the Threat Pulse wire contract, section 1.
const CONTRACT_VECTORS = [
  {
    objectType: PulseObjectType.Indicator,
    canonicalValue: 'observable:ipv4-addr:value:198.51.100.7',
    stableKey: 'aa134d3de491d5f3730d7fbbf9721582',
    hashSaltA: '9913881f71e8c61c79d05b20cf144d42',
    hashSaltB: '473d3d6874e64808b27015023eb31ab0',
  },
  {
    objectType: PulseObjectType.AttackPattern,
    canonicalValue: 'T1059.001',
    stableKey: '35b0088f1df3589a4d813145fed71859',
    hashSaltA: '541df1cb0fe4d5b0a879c3ead7dcde0f',
    hashSaltB: '62056e1fe59c9b896896e1bc3e426175',
  },
  {
    objectType: PulseObjectType.Vulnerability,
    canonicalValue: 'CVE-2024-3400',
    stableKey: '87655e1708ad94e5fa57eb00f06d0f82',
    hashSaltA: '002b59d753f94f8d6a7fc1a63689c794',
    hashSaltB: '137a0f53839b5e88968d277683333d7a',
  },
  {
    objectType: PulseObjectType.Malware,
    canonicalValue: 'lockbit',
    stableKey: '556ee18dbe0c4cf9e89515b7bd0755e5',
    hashSaltA: '8e3360dcb471a38402e9e4d356d0654a',
    hashSaltB: 'f5f48415bbd0546791c774dc0f287052',
  },
];

describe('pulseCrypto', () => {
  describe('contract test vectors', () => {
    it.each(CONTRACT_VECTORS)(
      'should derive the stable key of $objectType $canonicalValue like OpenCTI does',
      ({ objectType, canonicalValue, stableKey }) => {
        // Given the platform-side derivation of the contract
        const hmac = createHmac('sha256', 'opencti-pulse-v1');

        // When
        const derived = hmac
          .update(`${objectType}\n${canonicalValue}`)
          .digest()
          .subarray(0, 16)
          .toString('hex');

        // Then
        expect(derived).toBe(stableKey);
      }
    );

    it.each(
      CONTRACT_VECTORS.flatMap((vector) => [
        { ...vector, salt: SALT_A, hash: vector.hashSaltA, saltName: 'A' },
        { ...vector, salt: SALT_B, hash: vector.hashSaltB, saltName: 'B' },
      ])
    )(
      'should decrypt the $objectType transport hash under salt $saltName into the stable key',
      ({ salt, hash, stableKey }) => {
        // When
        const decrypted = PulseCrypto.transportHashToStableKey(hash, salt);

        // Then
        expect(decrypted.toString('hex')).toBe(stableKey);
      }
    );

    it.each(
      CONTRACT_VECTORS.flatMap((vector) => [
        { ...vector, salt: SALT_A, hash: vector.hashSaltA, saltName: 'A' },
        { ...vector, salt: SALT_B, hash: vector.hashSaltB, saltName: 'B' },
      ])
    )(
      'should encrypt the $objectType stable key under salt $saltName into the transport hash',
      ({ salt, hash, stableKey }) => {
        // When
        const encrypted = PulseCrypto.stableKeyToTransportHash(
          Buffer.from(stableKey, 'hex'),
          salt
        );

        // Then
        expect(encrypted).toBe(hash);
      }
    );
  });

  describe('at-rest keys', () => {
    it.each(CONTRACT_VECTORS)(
      'should map both daily hashes of $objectType to the same at-rest key',
      ({ hashSaltA, hashSaltB }) => {
        // When
        const fromDayA = PulseCrypto.transportHashToAtRestKey(
          hashSaltA,
          SALT_A,
          AT_REST_SECRET
        );
        const fromDayB = PulseCrypto.transportHashToAtRestKey(
          hashSaltB,
          SALT_B,
          AT_REST_SECRET
        );

        // Then
        expect(fromDayA).toBe(fromDayB);
      }
    );

    it.each(CONTRACT_VECTORS)(
      'should not store the stable key of $objectType itself',
      ({ hashSaltA, stableKey }) => {
        // When
        const atRestKey = PulseCrypto.transportHashToAtRestKey(
          hashSaltA,
          SALT_A,
          AT_REST_SECRET
        );

        // Then
        expect(atRestKey).not.toBe(stableKey);
      }
    );

    it('should depend on the Hub at-rest secret', () => {
      // Given
      const [vector] = CONTRACT_VECTORS;

      // When
      const withSecret = PulseCrypto.transportHashToAtRestKey(
        vector!.hashSaltA,
        SALT_A,
        AT_REST_SECRET
      );
      const withOtherSecret = PulseCrypto.transportHashToAtRestKey(
        vector!.hashSaltA,
        SALT_A,
        OTHER_AT_REST_SECRET
      );

      // Then
      expect(withSecret).not.toBe(withOtherSecret);
    });

    it.each(CONTRACT_VECTORS)(
      'should re-encrypt the $objectType at-rest key under another day salt',
      ({ hashSaltA, hashSaltB }) => {
        // Given
        const atRestKey = PulseCrypto.transportHashToAtRestKey(
          hashSaltA,
          SALT_A,
          AT_REST_SECRET
        );

        // When
        const hashForDayB = PulseCrypto.atRestKeyToTransportHash(
          atRestKey,
          SALT_B,
          AT_REST_SECRET
        );

        // Then
        expect(hashForDayB).toBe(hashSaltB);
      }
    );
  });

  describe('platformPseudonym', () => {
    it('should be stable for the same platform id', () => {
      // When
      const first = PulseCrypto.platformPseudonym(PLATFORM_ID, PLATFORM_SECRET);
      const second = PulseCrypto.platformPseudonym(
        PLATFORM_ID,
        PLATFORM_SECRET
      );

      // Then
      expect(first).toBe(second);
    });

    it('should differ between platforms', () => {
      // When
      const first = PulseCrypto.platformPseudonym(PLATFORM_ID, PLATFORM_SECRET);
      const other = PulseCrypto.platformPseudonym(
        OTHER_PLATFORM_ID,
        PLATFORM_SECRET
      );

      // Then
      expect(first).not.toBe(other);
    });

    it('should be the HMAC-SHA256 of the platform id under the Hub secret', () => {
      // Given
      const expected = createHmac('sha256', PLATFORM_SECRET)
        .update(PLATFORM_ID)
        .digest('hex');

      // When
      const pseudonym = PulseCrypto.platformPseudonym(
        PLATFORM_ID,
        PLATFORM_SECRET
      );

      // Then
      expect(pseudonym).toBe(expected);
    });
  });

  describe('input guards', () => {
    it.each([
      { description: 'a short block', hash: '00ff' },
      { description: 'a double block', hash: '00'.repeat(32) },
    ])('should reject $description', ({ hash }) => {
      // When
      const call = () => PulseCrypto.transportHashToStableKey(hash, SALT_A);

      // Then
      expect(call).toThrow('single AES blocks');
    });

    it('should reject a key that is not an AES-128 or AES-256 key', () => {
      // When
      const call = () =>
        PulseCrypto.stableKeyToAtRestKey(
          Buffer.alloc(16),
          Buffer.alloc(24)
        );

      // Then
      expect(call).toThrow('Unsupported AES key length');
    });

    it('should generate 16 random bytes per salt', () => {
      // When
      const first = PulseCrypto.generateSalt();
      const second = PulseCrypto.generateSalt();

      // Then
      expect(first).toHaveLength(16);
      expect(first.equals(second)).toBe(false);
    });
  });
});
