import type { Management } from 'auth0';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { buildEmailsQuery } from './auth0.util';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  listUsersByEmail: vi.fn(),
  update: vi.fn(),
}));

vi.mock('auth0', async (importOriginal) => {
  const actual = await importOriginal<typeof import('auth0')>();
  return {
    ...actual,
    ManagementClient: vi.fn(function () {
      return {
        users: {
          list: mocks.list,
          listUsersByEmail: mocks.listUsersByEmail,
          update: mocks.update,
        },
      };
    }),
    AuthenticationClient: vi.fn(function () {
      return {};
    }),
  };
});

const { auth0ClientImplementation } = await import('./implementation');

const buildAccount = (email: string, index = 0) =>
  ({
    user_id: `auth0|${email}-${index}`,
    email,
  }) as Management.UserResponseSchema;

const buildPage = (...pages: Management.UserResponseSchema[][]) => {
  let index = 0;
  const page = {
    rawResponse: TestHelper.auth0.rawResponse(200),
    data: pages[0] ?? [],
    hasNextPage: () => index < pages.length - 1,
    getNextPage: vi.fn(async () => {
      index += 1;
      page.data = pages[index] ?? [];
      return page;
    }),
  };
  return page;
};

const buildEmails = (count: number) =>
  Array.from({ length: count }, (_, i) => `user${i}@auth0-impl.test`);

const rateLimitError = () =>
  TestHelper.auth0.managementError(429, {
    'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) - 10),
  });

describe('auth0ClientImplementation.getUsersByEmails', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.list.mockImplementation(async () => buildPage([]));
  });

  it('should query Auth0 once for 50 emails', async () => {
    // Given
    const emails = buildEmails(50);

    // When
    await auth0ClientImplementation.getUsersByEmails(emails);

    // Then
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(mocks.list).toHaveBeenCalledWith(
      {
        q: buildEmailsQuery(emails),
        search_engine: 'v3',
        per_page: 100,
        fields: 'user_id,email,last_password_reset,user_metadata',
        include_fields: true,
      },
      { maxRetries: 0 }
    );
  });

  it('should split 51 emails in two queries of 50 and 1 emails', async () => {
    // Given
    const emails = buildEmails(51);

    // When
    await auth0ClientImplementation.getUsersByEmails(emails);

    // Then
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(mocks.list.mock.calls[0]![0]).toMatchObject({
      q: buildEmailsQuery(emails.slice(0, 50)),
    });
    expect(mocks.list.mock.calls[1]![0]).toMatchObject({
      q: buildEmailsQuery(emails.slice(50)),
    });
  });

  it('should lowercase and de-duplicate emails and lowercase the keys of the result', async () => {
    // Given
    mocks.list.mockImplementation(async () =>
      buildPage([buildAccount('Alice@Auth0-Impl.test')])
    );

    // When
    const result = await auth0ClientImplementation.getUsersByEmails([
      'Alice@Auth0-Impl.test',
      'alice@auth0-impl.test',
      'BOB@auth0-impl.test',
    ]);

    // Then
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(mocks.list.mock.calls[0]![0]).toMatchObject({
      q: buildEmailsQuery(['alice@auth0-impl.test', 'bob@auth0-impl.test']),
    });
    expect([...result.keys()]).toEqual(['alice@auth0-impl.test']);
    expect(result.get('alice@auth0-impl.test')).toMatchObject([
      { user_id: 'auth0|Alice@Auth0-Impl.test-0' },
    ]);
  });

  it('should collect the accounts of every page', async () => {
    // Given
    mocks.list.mockImplementation(async () =>
      buildPage(
        [buildAccount('a@auth0-impl.test')],
        [buildAccount('b@auth0-impl.test')]
      )
    );

    // When
    const result = await auth0ClientImplementation.getUsersByEmails([
      'a@auth0-impl.test',
      'b@auth0-impl.test',
    ]);

    // Then
    expect([...result.keys()]).toEqual([
      'a@auth0-impl.test',
      'b@auth0-impl.test',
    ]);
  });

  it('should retry after a 429 and return the accounts', async () => {
    // Given
    mocks.list
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValueOnce(buildPage([buildAccount('a@auth0-impl.test')]));

    // When
    const result = await auth0ClientImplementation.getUsersByEmails([
      'a@auth0-impl.test',
    ]);

    // Then
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(result.get('a@auth0-impl.test')).toMatchObject([
      { user_id: 'auth0|a@auth0-impl.test-0' },
    ]);
  });

  it('should retry the next page after a 429 without losing the first page', async () => {
    // Given
    const page = buildPage(
      [buildAccount('a@auth0-impl.test')],
      [buildAccount('b@auth0-impl.test')]
    );
    page.getNextPage.mockRejectedValueOnce(rateLimitError());
    mocks.list.mockResolvedValueOnce(page);

    // When
    const result = await auth0ClientImplementation.getUsersByEmails([
      'a@auth0-impl.test',
      'b@auth0-impl.test',
    ]);

    // Then
    expect(page.getNextPage).toHaveBeenCalledTimes(2);
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect([...result.keys()]).toEqual([
      'a@auth0-impl.test',
      'b@auth0-impl.test',
    ]);
  });

  it('should propagate an error that is not a rate limit without retrying', async () => {
    // Given
    mocks.list.mockRejectedValue(new Error('auth0 is down'));

    // When
    const result = auth0ClientImplementation.getUsersByEmails([
      'a@auth0-impl.test',
    ]);

    // Then
    await expect(result).rejects.toThrow('auth0 is down');
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });
});

describe('auth0ClientImplementation.updateUserRBACInstance', () => {
  const rbacInstance = { 'platform-1': { groups: ['Admin'] } };
  const expectedUpdate = {
    user_metadata: { rbac_instance: rbacInstance },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.update.mockResolvedValue(undefined);
  });

  it('should update every prefetched account without listing users again', async () => {
    // Given
    const prefetched = [
      buildAccount('a@auth0-impl.test', 1),
      buildAccount('a@auth0-impl.test', 2),
    ];

    // When
    await auth0ClientImplementation.updateUserRBACInstance(
      'a@auth0-impl.test',
      rbacInstance,
      prefetched
    );

    // Then
    expect(mocks.listUsersByEmail).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.update).toHaveBeenCalledWith(
      'auth0|a@auth0-impl.test-1',
      expectedUpdate,
      { maxRetries: 0 }
    );
    expect(mocks.update).toHaveBeenCalledWith(
      'auth0|a@auth0-impl.test-2',
      expectedUpdate,
      { maxRetries: 0 }
    );
  });

  it('should still list users by email when nothing is prefetched', async () => {
    // Given
    mocks.listUsersByEmail.mockResolvedValue([
      buildAccount('a@auth0-impl.test', 1),
    ]);

    // When
    await auth0ClientImplementation.updateUserRBACInstance(
      'a@auth0-impl.test',
      rbacInstance
    );

    // Then
    expect(mocks.listUsersByEmail).toHaveBeenCalledWith({
      email: 'a@auth0-impl.test',
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(
      'auth0|a@auth0-impl.test-1',
      expectedUpdate
    );
  });

  it('should throw when the prefetched accounts are empty', async () => {
    // When
    const result = auth0ClientImplementation.updateUserRBACInstance(
      'a@auth0-impl.test',
      rbacInstance,
      []
    );

    // Then
    await expect(result).rejects.toThrow('AUTH0_USER_NOT_FOUND_ERROR');
    expect(mocks.listUsersByEmail).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
