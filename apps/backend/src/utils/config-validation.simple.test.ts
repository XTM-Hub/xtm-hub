import { describe, expect, it, vi } from 'vitest';
import { logApp } from './app-logger.util';
import {
  parseEsIndexPrefix,
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
    ['an inner underscore', 'xtm_hub'],
    ['an inner dash', 'xtm-hub'],
    ['an inner dot', 'xtm.hub'],
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
      `[ELASTICSEARCH] Invalid elasticsearch.index_prefix configuration (ELASTIC_INDEX_PREFIX): expected lowercase letters, digits, '.', '_' or '-', starting with a letter or a digit, got ${JSON.stringify(value)}`
    );
  });
});
