import { Management } from 'auth0';
import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  buildEmailsQuery,
  buildUserMetadataUpdate,
  getRateLimitWaitMs,
  groupAccountsByEmail,
  isRateLimitError,
  removeEmptyGroups,
  withRateLimitRetry,
} from './auth0.util';
import { Auth0UpdateUserRBACInstance } from './client';

describe('removeEmptyGroups', () => {
  it('should remove entries with empty groups arrays', () => {
    const input: Auth0UpdateUserRBACInstance = {
      user1: { groups: ['admin', 'user'] },
      user2: { groups: [] },
      user3: { groups: ['viewer'] },
      user4: { groups: [] },
    };

    const expected: Auth0UpdateUserRBACInstance = {
      user1: { groups: ['admin', 'user'] },
      user3: { groups: ['viewer'] },
    };

    const result = removeEmptyGroups(input);
    expect(result).toEqual(expected);
  });

  it('should return empty object when all groups are empty', () => {
    const input: Auth0UpdateUserRBACInstance = {
      user1: { groups: [] },
      user2: { groups: [] },
      user3: { groups: [] },
    };

    const result = removeEmptyGroups(input);
    expect(result).toEqual({});
  });

  it('should keep all entries when no groups are empty', () => {
    const input: Auth0UpdateUserRBACInstance = {
      user1: { groups: ['admin'] },
      user2: { groups: ['user', 'viewer'] },
      user3: { groups: ['moderator'] },
    };

    const result = removeEmptyGroups(input);
    expect(result).toEqual(input);
  });

  it('should handle empty input object', () => {
    const input: Auth0UpdateUserRBACInstance = {};

    const result = removeEmptyGroups(input);
    expect(result).toEqual({});
  });

  it('should handle single entry with empty groups', () => {
    const input: Auth0UpdateUserRBACInstance = {
      user1: { groups: [] },
    };

    const result = removeEmptyGroups(input);
    expect(result).toEqual({});
  });
  it('should not crash for any value and still filter correctly', () => {
    const input = {
      user1: { groups: ['admin'] },
      user2: { groups: 'not-an-array' },
      user3: { groups: true },
      user4: { groups: { someObject: true } },
      user5: { groups: 123 },
      user6: { groups: ['viewer'] },
    } as unknown as Auth0UpdateUserRBACInstance;

    const expected: Auth0UpdateUserRBACInstance = {
      user1: { groups: ['admin'] },
      user6: { groups: ['viewer'] },
    };

    // Should not throw an error
    expect(() => removeEmptyGroups(input)).not.toThrow();

    // Should filter out non-array groups
    const result = removeEmptyGroups(input);
    expect(result).toEqual(expected);
  });
});

describe('buildUserMetadataUpdate', () => {
  it('should merge rbac_instance correctly', () => {
    const auth0_user = {
      user_id: 'auth0|123',
      user_metadata: {
        company_name: 'Filigran',
        country: 'France',
        rbac_instance: {
          platform_1: { groups: ['User'] },
        },
      },
    } as unknown as Management.UserResponseSchema;

    const userRBACInstance = {
      platform_2: { groups: ['Admin'] },
    };

    const result = buildUserMetadataUpdate(auth0_user, userRBACInstance);

    expect(result).toEqual({
      user_metadata: {
        company_name: 'Filigran',
        country: 'France',
        rbac_instance: {
          platform_1: { groups: ['User'] },
          platform_2: { groups: ['Admin'] },
        },
      },
    });
  });
  it('should init rbac_instance correctly', () => {
    const auth0_user = {
      user_id: 'auth0|123',
      user_metadata: {},
    } as Management.UserResponseSchema;

    const userRBACInstance = {
      platform_2: { groups: ['Admin'] },
    };

    const result = buildUserMetadataUpdate(auth0_user, userRBACInstance);

    expect(result).toEqual({
      user_metadata: {
        rbac_instance: {
          platform_2: { groups: ['Admin'] },
        },
      },
    });
  });
});

const toManagementError = (headers: Record<string, string>) =>
  TestHelper.auth0.managementError(429, headers);

const rateLimitError = (resetInSeconds?: number) =>
  toManagementError(
    resetInSeconds === undefined
      ? {}
      : {
          'x-ratelimit-reset': String(
            Math.floor(Date.now() / 1000) + resetInSeconds
          ),
        }
  );

describe('buildEmailsQuery', () => {
  it('should build an OR query and escape quotes and backslashes', () => {
    expect(buildEmailsQuery(['a@x.io', 'b"c@x.io', 'd\\e@x.io'])).toBe(
      'email:("a@x.io" OR "b\\"c@x.io" OR "d\\\\e@x.io")'
    );
  });
});

describe('groupAccountsByEmail', () => {
  it('should group accounts by lowercased email and skip accounts without email', () => {
    const accounts = [
      { user_id: '1', email: 'A@x.io' },
      { user_id: '2', email: 'a@x.io' },
      { user_id: '3', email: 'b@x.io' },
      { user_id: '4' },
    ] as Management.UserResponseSchema[];

    const result = groupAccountsByEmail(accounts);

    expect([...result.keys()]).toEqual(['a@x.io', 'b@x.io']);
    expect(result.get('a@x.io')).toMatchObject([
      { user_id: '1' },
      { user_id: '2' },
    ]);
    expect(result.get('b@x.io')).toMatchObject([{ user_id: '3' }]);
  });
});

describe('rate limit handling', () => {
  it('should detect a 429 error', () => {
    expect(isRateLimitError(rateLimitError())).toBe(true);
    expect(isRateLimitError(new Error('boom'))).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
    expect(isRateLimitError(TestHelper.auth0.managementError(500))).toBe(false);
  });

  it('should wait until x-ratelimit-reset', () => {
    const now = 1_000_000_000_000;
    const error = toManagementError({
      'x-ratelimit-reset': String(now / 1000 + 5),
    });

    expect(getRateLimitWaitMs(error, now)).toBe(5000);
  });

  it('should fall back to a default wait without header', () => {
    expect(getRateLimitWaitMs(rateLimitError())).toBe(1000);
  });

  it('should retry after a 429 and return the result', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const call = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError(0))
      .mockResolvedValueOnce('ok');

    const result = await withRateLimitRetry(call, sleep);

    expect(result).toBe('ok');
    expect(call).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('should rethrow the 429 once retries are exhausted', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const call = vi.fn().mockRejectedValue(rateLimitError(0));

    await expect(withRateLimitRetry(call, sleep)).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(call).toHaveBeenCalledTimes(4);
  });

  it('should not retry other errors', async () => {
    const sleep = vi.fn();
    const call = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(withRateLimitRetry(call, sleep)).rejects.toThrow('boom');
    expect(call).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
