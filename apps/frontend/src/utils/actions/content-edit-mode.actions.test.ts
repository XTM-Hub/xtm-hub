import { EDIT_MODE_COOKIE_NAME } from '@/utils/edit-mode-cookie';
import { loadMeUser } from '@/utils/load-me-user';
import { PortalCapability } from '@graphql/generated';
import { cookies } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import setContentEditModeAction from './content-edit-mode.actions';

vi.mock('@/utils/load-me-user', () => ({ loadMeUser: vi.fn() }));

type MeUser = Awaited<ReturnType<typeof loadMeUser>>;
type CookieStore = Awaited<ReturnType<typeof cookies>>;

const makeMeUser = (capabilities: PortalCapability[]): MeUser => ({
  id: 'user-id',
  selected_organization_id: 'organization-id',
  organizations: [],
  capabilities: capabilities.map((name) => ({ name })),
  selected_org_capabilities: [],
});

describe('setContentEditModeAction', () => {
  const setCookie = vi.fn();
  const deleteCookie = vi.fn();

  beforeEach(() => {
    // Only the methods the action calls: the full cookie store is not needed.
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
      set: setCookie,
      delete: deleteCookie,
    } as unknown as CookieStore);
  });

  it('should set an httpOnly edit-mode cookie when a BYPASS user turns edit mode on', async () => {
    // Given
    vi.mocked(loadMeUser).mockResolvedValue(
      makeMeUser([PortalCapability.Bypass])
    );

    // When
    await setContentEditModeAction(true);

    // Then
    expect(setCookie).toHaveBeenCalledWith(EDIT_MODE_COOKIE_NAME, '1', {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    });
  });

  it.each([
    ['a user without the BYPASS capability', makeMeUser([])],
    ['an anonymous visitor', null],
  ])(
    'should not set the edit-mode cookie when %s turns edit mode on',
    async (_label, me) => {
      // Given
      vi.mocked(loadMeUser).mockResolvedValue(me);

      // When
      await setContentEditModeAction(true);

      // Then
      expect(setCookie).not.toHaveBeenCalled();
    }
  );

  it('should delete the edit-mode cookie when edit mode is turned off', async () => {
    // Given
    vi.mocked(loadMeUser).mockResolvedValue(null);

    // When
    await setContentEditModeAction(false);

    // Then
    expect(deleteCookie).toHaveBeenCalledWith(EDIT_MODE_COOKIE_NAME);
  });
});
