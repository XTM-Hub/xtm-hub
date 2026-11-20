import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { createQueryClient } from '@/lib/query-client';
import { loadCurrentUser, loadMeUser } from '@/utils/load-me-user';
import type { MeQuery } from '@graphql/generated';
import { meKeys } from '@graphql/me/me.keys';
import { mockUser } from '@graphql/mocks';
import { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(),
}));

const USER = mockUser({ id: 'user-1' });

const request = vi.fn();

const givenMeResponse = (response: MeQuery) =>
  request.mockResolvedValue(response);

beforeEach(() => {
  request.mockReset();
  vi.mocked(getAuthenticatedGraphqlClient).mockResolvedValue(
    Object.assign(new GraphQLClient('http://localhost'), { request })
  );
  givenMeResponse({ me: USER });
});

describe('loadMeUser', () => {
  it('should return the user when the identity request succeeds', async () => {
    // Given
    givenMeResponse({ me: USER });

    // When
    const me = loadMeUser();

    // Then
    await expect(me).resolves.toEqual(USER);
  });

  it('should return null when the identity payload is absent', async () => {
    // Given
    givenMeResponse({ me: null });

    // When
    const me = loadMeUser();

    // Then
    await expect(me).resolves.toBeNull();
  });

  it('should leave the user under the key the user context reads when a query client is given', async () => {
    // Given
    const queryClient = createQueryClient();

    // When
    await loadMeUser(queryClient);

    // Then
    expect(queryClient.getQueryData(meKeys.detail())).toEqual({ me: USER });
  });
});

describe('loadCurrentUser', () => {
  it('should resolve null when the identity request fails', async () => {
    // Given
    request.mockRejectedValue(new Error('unauthenticated'));

    // When
    const me = loadCurrentUser();

    // Then
    await expect(me).resolves.toBeNull();
  });

  it('should return the user when the identity request succeeds', async () => {
    // Given
    givenMeResponse({ me: USER });

    // When
    const me = loadCurrentUser();

    // Then
    await expect(me).resolves.toEqual(USER);
  });
});
