import { describe, expect, it } from 'vitest';
import { REDACTED_VALUE, redactSecrets } from './redact-secrets.util';

describe('redactSecrets', () => {
  it('redacts the token of a connectivity refresh', () => {
    const variables = {
      input: {
        platformId: 'c9e8fee1-8cb4-4fff-b335-5ea350615df4',
        token: 'b6a1d0c2-3f4e-4a5b-9c8d-7e6f5a4b3c2d',
        platformVersion: '6.9.0',
      },
    };

    expect(redactSecrets(variables)).toEqual({
      input: {
        platformId: 'c9e8fee1-8cb4-4fff-b335-5ea350615df4',
        token: REDACTED_VALUE,
        platformVersion: '6.9.0',
      },
    });
  });

  it('redacts every tenant token of an all-tenants refresh', () => {
    const variables = {
      input: {
        platformId: 'platform-id',
        tenants: [
          { tenantId: 'tenant-a', token: 'token-a' },
          { tenantId: 'tenant-b', token: 'token-b' },
        ],
      },
    };

    expect(redactSecrets(variables)).toEqual({
      input: {
        platformId: 'platform-id',
        tenants: [
          { tenantId: 'tenant-a', token: REDACTED_VALUE },
          { tenantId: 'tenant-b', token: REDACTED_VALUE },
        ],
      },
    });
  });

  it.each([
    ['password', { email: 'user@example.com', password: 'secret-password' }],
    ['platformToken', { platformToken: 'platform-token' }],
    ['client_secret', { client_secret: 'client-secret' }],
  ])('redacts %s whatever its case', (key, variables) => {
    const redacted = redactSecrets(variables) as Record<string, unknown>;

    expect(redacted[key]).toBe(REDACTED_VALUE);
  });

  it.each([[undefined], [null], ['plain text'], [42]])(
    'returns %s unchanged',
    (value) => {
      expect(redactSecrets(value)).toBe(value);
    }
  );

  it('does not modify the original variables', () => {
    const variables = { input: { token: 'token' } };

    redactSecrets(variables);

    expect(variables.input.token).toBe('token');
  });
});
