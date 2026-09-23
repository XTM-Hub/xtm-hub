import { EDIT_MODE_COOKIE_NAME } from '@/utils/edit-mode-cookie';
import { loadMeUser } from '@/utils/load-me-user';
import { PortalCapability } from '@graphql/generated';
import { cookies } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isContentEditModeActive } from './content-edit-mode.server';

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

const givenEditModeCookie = (value: string | undefined) => {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      name === EDIT_MODE_COOKIE_NAME && value !== undefined
        ? { name, value }
        : undefined,
  } as CookieStore);
};

describe('isContentEditModeActive', () => {
  beforeEach(() => {
    vi.mocked(loadMeUser).mockResolvedValue(
      makeMeUser([PortalCapability.Bypass])
    );
  });

  it('should be active when the edit-mode cookie is set for a BYPASS user', async () => {
    // Given
    givenEditModeCookie('1');

    // When
    const isActive = await isContentEditModeActive();

    // Then
    expect(isActive).toBe(true);
  });

  it.each([
    ['the cookie is missing', undefined],
    ['the cookie has another value', '0'],
  ])('should be inactive when %s', async (_label, cookieValue) => {
    // Given
    givenEditModeCookie(cookieValue);

    // When
    const isActive = await isContentEditModeActive();

    // Then
    expect(isActive).toBe(false);
  });

  it('should be inactive when the cookie is forged by a user without the BYPASS capability', async () => {
    // Given
    givenEditModeCookie('1');
    vi.mocked(loadMeUser).mockResolvedValue(makeMeUser([]));

    // When
    const isActive = await isContentEditModeActive();

    // Then
    expect(isActive).toBe(false);
  });

  it('should be inactive when the cookie is set without an authenticated user', async () => {
    // Given
    givenEditModeCookie('1');
    vi.mocked(loadMeUser).mockResolvedValue(null);

    // When
    const isActive = await isContentEditModeActive();

    // Then
    expect(isActive).toBe(false);
  });

  it('should be inactive when the current user cannot be loaded', async () => {
    // Given
    givenEditModeCookie('1');
    vi.mocked(loadMeUser).mockRejectedValue(new Error('backend unreachable'));

    // When
    const isActive = await isContentEditModeActive();

    // Then
    expect(isActive).toBe(false);
  });
});
