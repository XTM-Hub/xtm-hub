import { describe, expect, it, vi } from 'vitest';
import { logApp } from './app-logger.util';
import {
  parseEsEngineClient,
  parseEsIndexPrefix,
  parseEsRequestTimeout,
  parseTrustProxy,
  resolveTrustProxy,
  validateDevUser,
} from './config-validation.util';

describe('zod Config Validation', () => {
  it('should validate a valid dev user', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = validateDevUser(validUser);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      email: 'not-an-email',
      password: 'password123',
    };

    const result = validateDevUser(invalidUser);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject short password', () => {
    const invalidUser = {
      email: 'test@example.com',
      password: '123',
    };

    const result = validateDevUser(invalidUser);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate user with organization', () => {
    const userWithOrg = {
      email: 'test@example.com',
      password: 'password123',
      organization: {
        name: 'Test Org',
        domains: ['example.com'],
      },
    };

    const result = validateDevUser(userWithOrg);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('parseTrustProxy', () => {
  it.each([
    ['a number', 1, 1],
    ['a numeric string, as node-config returns env vars', '1', 1],
    ['a hop count above one', '2', 2],
    ['0, which disables trust', 0, false],
    ['"0", which disables trust', '0', false],
  ])(
    'should parse the hop count when given %s',
    (_description, value, expected) => {
      // Given
      // value and expected come from the dataset

      // When
      const result = parseTrustProxy(value);

      // Then
      expect(result).toBe(expected);
    }
  );

  it.each([
    ['boolean true', true],
    ['the string "true"', 'true'],
    ['a non-numeric string', 'abc'],
    ['a negative number', -1],
    ['a negative numeric string', '-1'],
    ['a decimal string', '1.5'],
    ['a decimal number', 1.5],
    ['an integer string beyond the safe range', '99999999999999999999'],
    ['a signed numeric string', '+1'],
    ['an exponent string', '1e3'],
    ['a hexadecimal string', '0x1'],
    ['a CIDR', '10.0.0.0/8'],
    ['an IP address', '10.0.0.1'],
    ['an Express keyword', 'loopback'],
    ['an empty string', ''],
    ['a padded number', ' 1'],
    ['null', null],
    ['undefined', undefined],
    ['an array', []],
  ])(
    'should log an error and fall back to false when given %s',
    (_description, value) => {
      // Given
      const logErrorSpy = vi
        .spyOn(logApp, 'error')
        .mockImplementation(() => {});

      // When
      const result = parseTrustProxy(value);

      // Then
      expect(result).toBe(false);
      expect(logErrorSpy).toHaveBeenCalledExactlyOnceWith(
        `[TRUST-PROXY] Invalid trust_proxy configuration (TRUST_PROXY): expected a non-negative integer hop count, got ${JSON.stringify(value)}, falling back to false`
      );
    }
  );
});

describe('resolveTrustProxy', () => {
  it('should trust no proxy in local dev even when one hop is configured', () => {
    // Given
    const configured = 1;
    const localDev = true;

    // When
    const result = resolveTrustProxy(configured, localDev);

    // Then
    expect(result).toBe(false);
  });

  it('should parse the configured hop count outside local dev', () => {
    // Given
    const configured = '2';
    const localDev = false;

    // When
    const result = resolveTrustProxy(configured, localDev);

    // Then
    expect(result).toBe(2);
  });
});

const LONGEST_ES_INDEX_PREFIX = 'h'.repeat(100);

describe('parseEsIndexPrefix', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string, as an unset env var', ''],
  ])('should return no prefix when given %s', (_description, value) => {
    // Given
    // value comes from the dataset

    // When
    const result = parseEsIndexPrefix(value);

    // Then
    expect(result).toBe('');
  });

  it.each([
    ['lowercase letters', 'hub'],
    ['letters and digits', 'hub2'],
    ['a leading digit', '2hub'],
    ['an inner dash', 'xtm-hub'],
    ['an inner dot', 'xtm.hub'],
    ['100 characters', LONGEST_ES_INDEX_PREFIX],
  ])('should keep the prefix when given %s', (_description, value) => {
    // Given
    // value comes from the dataset

    // When
    const result = parseEsIndexPrefix(value);

    // Then
    expect(result).toBe(value);
  });

  it.each([
    ['uppercase letters', 'Hub'],
    ['a leading underscore', '_hub'],
    ['an inner underscore', 'xtm_hub'],
    [
      'a prefix whose template pattern overlaps the unprefixed one',
      'telemetry_v2',
    ],
    [
      "a prefix whose template pattern overlaps the one of prefix 'hub'",
      'hub_telemetry_v2',
    ],
    ['101 characters', `${LONGEST_ES_INDEX_PREFIX}h`],
    ['a leading dash', '-hub'],
    ['a leading plus', '+hub'],
    ['a leading dot', '.hub'],
    ['a space', 'xtm hub'],
    ['a padded value', ' hub'],
    ['a wildcard', 'hub*'],
    ['a comma', 'hub,other'],
    ['a slash', 'hub/other'],
    ['a colon', 'hub:other'],
    ['a hash', 'hub#'],
    ['a number', 1],
    ['a boolean', true],
    ['an array', ['hub']],
  ])('should throw an explicit error when given %s', (_description, value) => {
    // Given
    // value comes from the dataset

    // When
    const parse = () => parseEsIndexPrefix(value);

    // Then
    expect(parse).toThrow(
      `[ELASTICSEARCH] Invalid elasticsearch.index_prefix configuration (ELASTIC_INDEX_PREFIX): expected at most 100 lowercase letters, digits, '.' or '-', starting with a letter or a digit, got ${JSON.stringify(value)}`
    );
  });
});

describe('parseEsEngineClient', () => {
  it.each([
    ['undefined', undefined, 'auto'],
    ['null', null, 'auto'],
    ['an empty string, as an unset env var', '', 'auto'],
    ['auto', 'auto', 'auto'],
    ['elasticsearch8', 'elasticsearch8', 'elasticsearch8'],
    ['elasticsearch9', 'elasticsearch9', 'elasticsearch9'],
  ])(
    'should return the client setting when given %s',
    (_description, value, expected) => {
      // Given
      // value comes from the dataset

      // When
      const result = parseEsEngineClient(value);

      // Then
      expect(result).toBe(expected);
    }
  );

  it('should refuse OpenSearch as not supported', () => {
    // Given
    const value = 'opensearch';

    // When
    const parse = () => parseEsEngineClient(value);

    // Then
    expect(parse).toThrow('[ELASTICSEARCH] OpenSearch is not supported');
  });

  it.each([
    ['an unknown client', 'elasticsearch7'],
    ['an uppercase value', 'Elasticsearch9'],
    ['a padded value', ' auto'],
    ['a number', 9],
    ['a boolean', true],
  ])('should throw an explicit error when given %s', (_description, value) => {
    // Given
    // value comes from the dataset

    // When
    const parse = () => parseEsEngineClient(value);

    // Then
    expect(parse).toThrow(
      `[ELASTICSEARCH] Invalid elasticsearch.engine_client configuration (ELASTIC_ENGINE_CLIENT): expected one of auto, elasticsearch8, elasticsearch9, got ${JSON.stringify(value)}`
    );
  });
});

describe('parseEsRequestTimeout', () => {
  it.each([
    ['undefined', undefined, 600_000],
    ['null', null, 600_000],
    ['an empty string, as an unset env var', '', 600_000],
    ['a number', 30_000, 30_000],
    ['a string of digits, as an env var', '120000', 120_000],
  ])(
    'should return the timeout in milliseconds when given %s',
    (_description, value, expected) => {
      // Given
      // value comes from the dataset

      // When
      const result = parseEsRequestTimeout(value);

      // Then
      expect(result).toBe(expected);
    }
  );

  it.each([
    ['zero', 0],
    ['a negative number', -1],
    ['a decimal number', 1.5],
    ['a string that is not a number', '10s'],
    ['a boolean', true],
  ])('should throw an explicit error when given %s', (_description, value) => {
    // Given
    // value comes from the dataset

    // When
    const parse = () => parseEsRequestTimeout(value);

    // Then
    expect(parse).toThrow(
      `[ELASTICSEARCH] Invalid elasticsearch.request_timeout configuration (ELASTIC_REQUEST_TIMEOUT): expected a positive number of milliseconds, got ${JSON.stringify(value)}`
    );
  });
});
