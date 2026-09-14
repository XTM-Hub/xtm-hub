import serverPortalApiFetch from '@/relay/server-portal-api-fetch';
import { loadCurrentUser, loadMeUser } from '@/utils/load-me-user';
import MeLoaderQuery from '@generated/meLoaderQuery.graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/relay/server-portal-api-fetch', () => ({
  default: vi.fn(),
}));

describe('loadMeUser', () => {
  beforeEach(() => {
    vi.mocked(serverPortalApiFetch).mockResolvedValue({
      data: { me: { id: 'user-1' } },
    } as never);
  });

  it('never serves the identity query from the Next.js Data Cache', async () => {
    await loadMeUser();

    expect(serverPortalApiFetch).toHaveBeenCalledWith(
      MeLoaderQuery,
      {},
      { cache: 'no-store' }
    );
  });

  it('returns the me payload', async () => {
    await expect(loadMeUser()).resolves.toEqual({ id: 'user-1' });
  });

  it('returns null when the identity payload is absent', async () => {
    vi.mocked(serverPortalApiFetch).mockResolvedValue({
      data: { me: null },
    } as never);

    await expect(loadMeUser()).resolves.toBeNull();
  });
});

describe('loadCurrentUser', () => {
  it('swallows a rejected identity request and resolves null', async () => {
    vi.mocked(serverPortalApiFetch).mockRejectedValue(
      new Error('unauthenticated')
    );

    await expect(loadCurrentUser()).resolves.toBeNull();
  });

  it('returns the user when the identity request succeeds', async () => {
    vi.mocked(serverPortalApiFetch).mockResolvedValue({
      data: { me: { id: 'user-1' } },
    } as never);

    await expect(loadCurrentUser()).resolves.toEqual({ id: 'user-1' });
  });
});
