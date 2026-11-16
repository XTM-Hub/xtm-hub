import Header from '@/components/Header';
import { clearFiltersStorage } from '@/utils/filters-storage.utils';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  logoutOptions: undefined as { onSuccess: () => void } | undefined,
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useLogoutMutation: (
    _client: unknown,
    options: (typeof mocks)['logoutOptions']
  ) => {
    mocks.logoutOptions = options;
    return { mutate: mocks.logout };
  },
}));

vi.mock('@/utils/filters-storage.utils', () => ({
  clearFiltersStorage: vi.fn(),
}));

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/logo_xtm_hub_dark.svg', async () => {
  const React = await import('react');
  return { default: () => React.createElement('svg', { role: 'img' }) };
});
vi.mock('@public/logo_xtm_hub_light.svg', async () => {
  const React = await import('react');
  return { default: () => React.createElement('svg', { role: 'img' }) };
});

// Data-fetching header widgets not under test.
vi.mock('@/components/connected-products/ConnectedProductsDropdown', () => ({
  ConnectedProductsDropdown: () => <div />,
}));
vi.mock(
  '@/components/menu/organization-switcher/HeaderOrganizationSwitcher',
  () => ({ default: () => <div /> })
);
vi.mock('@/components/menu/navigation/private/PrivateNavigation', () => ({
  default: () => <div />,
}));

const openUserMenu = async (user: ReturnType<typeof testRender>['user']) => {
  await user.click(screen.getByRole('button', { name: 'MenuUser.ToggleUser' }));
};

describe('Header', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should log out when the user chooses to log out', async () => {
    // Given
    const { user } = testRender(<Header />);
    await openUserMenu(user);

    // When
    await user.click(
      screen.getByRole('menuitem', { name: 'LoginPage.Logout' })
    );

    // Then
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it('should clear the filters and reload the home page when the logout succeeds', () => {
    // Given
    const location = { href: '/app' };
    vi.stubGlobal('location', location);
    testRender(<Header />);

    // When
    mocks.logoutOptions?.onSuccess();

    // Then
    expect(clearFiltersStorage).toHaveBeenCalledOnce();
    expect(location.href).toBe('/');
  });
});
