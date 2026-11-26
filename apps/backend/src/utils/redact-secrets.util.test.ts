import { describe, expect, it } from 'vitest';
import {
  REDACTED_VALUE,
  redactGraphQLRequest,
  redactSecrets,
} from './redact-secrets.util';

const CREDENTIAL = 'credential-value';

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

describe('redactGraphQLRequest', () => {
  it('redacts a secret variable whatever the name the client gave it', () => {
    const request = {
      query:
        'mutation Login($p: String) { login(email: "user@example.com", password: $p) { id } }',
      variables: { p: CREDENTIAL },
    };

    expect(redactGraphQLRequest(request)).toEqual({
      query: request.query,
      variables: { p: REDACTED_VALUE },
    });
  });

  it('redacts a variable bound to a secret field of an input object literal', () => {
    const request = {
      query:
        'mutation Refresh($id: ID!, $t: String!) { refreshPlatformRegistrationConnectivityStatus(input: { platformId: $id, token: $t }) }',
      variables: { id: 'platform-id', t: CREDENTIAL },
    };

    expect(redactGraphQLRequest(request).variables).toEqual({
      id: 'platform-id',
      t: REDACTED_VALUE,
    });
  });

  it.each([
    [
      'an argument literal',
      `mutation { login(email: "user@example.com", password: "${CREDENTIAL}") { id } }`,
    ],
    [
      'a variable default value',
      `mutation Login($p: String = "${CREDENTIAL}") { login(email: "user@example.com", password: $p) { id } }`,
    ],
    [
      'an input field literal',
      `mutation { refreshPlatformRegistrationConnectivityStatus(input: { platformId: "platform-id", token: "${CREDENTIAL}" }) }`,
    ],
  ])('redacts a secret written as %s in the query', (_, query) => {
    const redacted = redactGraphQLRequest({ query, variables: {} });

    expect(redacted.query).not.toContain(CREDENTIAL);
    expect(redacted.query).toContain(REDACTED_VALUE);
  });

  it('keeps the values that are not secrets', () => {
    const request = {
      query:
        'mutation Login($email: String!, $p: String) { login(email: $email, password: $p) { id } }',
      variables: { email: 'user@example.com', p: CREDENTIAL },
    };

    expect(redactGraphQLRequest(request).variables).toEqual({
      email: 'user@example.com',
      p: REDACTED_VALUE,
    });
  });

  it.each([
    ['missing', undefined],
    ['unparsable', 'mutation { login(password: $p'],
  ])(
    'drops the query and redacts every variable when the query is %s',
    (_, query) => {
      expect(
        redactGraphQLRequest({
          query,
          variables: { email: 'user@example.com', p: CREDENTIAL },
        })
      ).toEqual({
        query: undefined,
        variables: { email: REDACTED_VALUE, p: REDACTED_VALUE },
      });
    }
  );
});
