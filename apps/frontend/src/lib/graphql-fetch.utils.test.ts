import { describe, expect, it, vi } from 'vitest';
import {
  buildCookieHeader,
  extractOperationName,
  extractOperationType,
  GraphqlRequestError,
  prepareUri,
  resolveActiveCacheConfig,
  scrubSensitiveVariables,
  throwOnGraphqlErrors,
  UnauthenticatedError,
} from './graphql-fetch.utils';

const { isDevelopment } = vi.hoisted(() => ({ isDevelopment: vi.fn() }));
vi.mock('@/lib/utils', () => ({ isDevelopment }));

describe('scrubSensitiveVariables', () => {
  describe('sensitive top-level fields', () => {
    it.each`
      field              | input
      ${'password'}      | ${{ email: 'user@example.com', password: 's3cr3t' }}
      ${'token'}         | ${{ userId: '1', token: 'tok_abc' }}
      ${'secret'}        | ${{ name: 'app', secret: 'shh' }}
      ${'apiKey'}        | ${{ service: 'stripe', apiKey: 'sk_live_xxx' }}
      ${'api_key'}       | ${{ service: 'stripe', api_key: 'sk_live_xxx' }}
      ${'accessToken'}   | ${{ accessToken: 'eyJhb...' }}
      ${'refreshToken'}  | ${{ refreshToken: 'eyJhb...' }}
      ${'access_token'}  | ${{ access_token: 'eyJhb...' }}
      ${'refresh_token'} | ${{ refresh_token: 'eyJhb...' }}
    `(
      'hide $field at the top level',
      ({ field, input }: { field: string; input: Record<string, unknown> }) => {
        const result = scrubSensitiveVariables(input);
        expect(result[field]).toBe('[HIDDEN]');
      }
    );
  });

  describe('non-sensitive fields', () => {
    it.each`
      description        | input
      ${'string value'}  | ${{ email: 'user@example.com' }}
      ${'number value'}  | ${{ page: 1 }}
      ${'boolean value'} | ${{ active: true }}
      ${'null value'}    | ${{ cursor: null }}
      ${'array value'}   | ${{ ids: ['a', 'b', 'c'] }}
    `(
      'passes through $description unchanged',
      ({ input }: { input: Record<string, unknown> }) => {
        expect(scrubSensitiveVariables(input)).toEqual(input);
      }
    );
  });

  describe('mixed objects', () => {
    it('keeps safe fields and redacts sensitive fields in the same object', () => {
      const result = scrubSensitiveVariables({
        email: 'user@example.com',
        password: 's3cr3t',
        rememberMe: true,
      });
      expect(result).toEqual({
        email: 'user@example.com',
        password: '[HIDDEN]',
        rememberMe: true,
      });
    });
  });

  describe('nested objects', () => {
    it('recursively redacts sensitive fields inside a nested input object', () => {
      const result = scrubSensitiveVariables({
        input: {
          username: 'admin',
          password: 'hunter2',
          profile: {
            bio: 'Hello',
            token: 'nested-tok',
          },
        },
      });
      expect(result).toEqual({
        input: {
          username: 'admin',
          password: '[HIDDEN]',
          profile: {
            bio: 'Hello',
            token: '[HIDDEN]',
          },
        },
      });
    });

    it('passes through arrays of primitives unchanged', () => {
      const input = { tags: ['a', 'b'] };
      expect(scrubSensitiveVariables(input)).toEqual(input);
    });

    it('recurses into arrays of objects', () => {
      const result = scrubSensitiveVariables({
        items: [
          { email: 'user@example.com', password: 'hunter2' },
          { email: 'other@example.com', token: 'nested-tok' },
        ],
      });
      expect(result).toEqual({
        items: [
          { email: 'user@example.com', password: '[HIDDEN]' },
          { email: 'other@example.com', token: '[HIDDEN]' },
        ],
      });
    });
  });

  describe('edge cases', () => {
    it('returns an empty object unchanged', () => {
      expect(scrubSensitiveVariables({})).toEqual({});
    });

    it('returns null as-is', () => {
      expect(scrubSensitiveVariables(null)).toBeNull();
    });

    it('returns undefined as-is', () => {
      expect(scrubSensitiveVariables(undefined)).toBeUndefined();
    });
  });

  describe('buildCookieHeader', () => {
    it.each`
      description           | input                                                                    | expected
      ${'single cookie'}    | ${[{ name: 'session', value: 'abc' }]}                                   | ${'session=abc'}
      ${'multiple cookies'} | ${[{ name: 'session', value: 'abc' }, { name: 'theme', value: 'dark' }]} | ${'session=abc; theme=dark'}
      ${'empty array'}      | ${[]}                                                                    | ${undefined}
      ${'undefined'}        | ${undefined}                                                             | ${undefined}
    `('should return $expected for $description', ({ input, expected }) => {
      expect(buildCookieHeader(input)).toBe(expected);
    });
  });
});

describe('UnauthenticatedError', () => {
  it('has name "UnauthenticatedError" and message "UNAUTHENTICATED"', () => {
    const error = new UnauthenticatedError();
    expect(error.name).toBe('UnauthenticatedError');
    expect(error.message).toBe('UNAUTHENTICATED');
  });
});

describe('throwOnGraphqlErrors', () => {
  it.each([
    ['undefined', undefined],
    ['empty array', []],
  ])('does not throw when errors is %s', (_desc, errors) => {
    expect(() => throwOnGraphqlErrors(errors)).not.toThrow();
  });

  it('throws UnauthenticatedError when any error has extensions.code UNAUTHENTICATED', () => {
    expect(() =>
      throwOnGraphqlErrors([
        { message: 'Forbidden' },
        {
          message: 'Not authenticated',
          extensions: { code: 'UNAUTHENTICATED' },
        },
      ])
    ).toThrow(UnauthenticatedError);
  });

  it('throws an Error with the first message otherwise', () => {
    expect(() =>
      throwOnGraphqlErrors([{ message: 'Boom' }, { message: 'Second' }])
    ).toThrow('Boom');
  });

  it('keeps the code of the first error on the thrown error', () => {
    expect(() =>
      throwOnGraphqlErrors([
        { message: 'SERVICE_NOT_FOUND', extensions: { code: 'NOT_FOUND' } },
        { message: 'Second', extensions: { code: 'BAD_REQUEST' } },
      ])
    ).toThrow(
      expect.objectContaining({
        message: 'SERVICE_NOT_FOUND',
        code: 'NOT_FOUND',
      })
    );
  });

  it('throws a GraphqlRequestError when no error is UNAUTHENTICATED', () => {
    expect(() => throwOnGraphqlErrors([{ message: 'Boom' }])).toThrow(
      GraphqlRequestError
    );
  });

  it('falls back to a generic message when the first error has no message', () => {
    // Simulates a malformed server response where `message` is absent despite the type.
    expect(() =>
      throwOnGraphqlErrors([{ message: undefined as unknown as string }])
    ).toThrow('GraphQL request failed');
  });
});

describe('prepareUri', () => {
  it.each([
    [undefined, 'http://localhost:4002/'],
    ['http://localhost:4002', 'http://localhost:4002/'],
    ['http://localhost:4002/', 'http://localhost:4002/'],
  ])('prepareUri(%s) -> %s', (input, expected) => {
    expect(prepareUri(input)).toBe(expected);
  });
});

describe('extractOperationType', () => {
  it.each`
    query                              | expected
    ${'query MyQuery { field }'}       | ${'QUERY'}
    ${'mutation MyMutation { field }'} | ${'MUTATION'}
    ${'subscription MySub { field }'}  | ${'SUBSCRIPTION'}
    ${'{ field }'}                     | ${'QUERY'}
  `('extractOperationType("$query") -> $expected', ({ query, expected }) => {
    expect(extractOperationType(query)).toBe(expected);
  });
});

describe('extractOperationName', () => {
  it.each`
    query                        | expected
    ${'query MyQuery { field }'} | ${'MyQuery'}
    ${'{ field }'}               | ${'Anonymous'}
  `('extractOperationName("$query") -> $expected', ({ query, expected }) => {
    expect(extractOperationName(query)).toBe(expected);
  });
});

describe('resolveActiveCacheConfig', () => {
  it('forces no-store in development regardless of the requested cache config', () => {
    isDevelopment.mockReturnValue(true);
    expect(resolveActiveCacheConfig({ cache: 'force-cache' })).toEqual({
      cache: 'no-store',
    });
  });

  it.each([
    ['3600', 3600],
    ['false', false],
    ['0', 0],
  ])(
    'strips next.revalidate when it is %s and development forces no-store',
    (_desc, revalidate) => {
      isDevelopment.mockReturnValue(true);
      const options = {
        cache: 'force-cache' as const,
        next: { revalidate, tags: ['tag'] },
      };
      expect(resolveActiveCacheConfig(options)).toEqual({
        cache: 'no-store',
        next: { tags: ['tag'] },
      });
    }
  );

  it('leaves the given options untouched', () => {
    isDevelopment.mockReturnValue(true);
    const options = {
      cache: 'force-cache' as const,
      next: { revalidate: 3600 },
    };
    resolveActiveCacheConfig(options);
    expect(options).toEqual({
      cache: 'force-cache',
      next: { revalidate: 3600 },
    });
  });

  it('returns the requested cache config unchanged outside development', () => {
    isDevelopment.mockReturnValue(false);
    const options = {
      cache: 'force-cache' as const,
      next: { revalidate: 3600 },
    };
    expect(resolveActiveCacheConfig(options)).toEqual(options);
  });
});
