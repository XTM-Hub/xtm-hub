import { AdminBanner } from '@/components/admin/AdminBanner';
import testRender from '@/utils/test/test-render';
import { PortalCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

const ADMIN_BANNER_TEXT = 'AdminBanner';
const ADMIN_PATH = '/app/admin/user';
const USER_PATH = '/app/service';
const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };

describe('AdminBanner', () => {
  it('should warn that admin mode is active when an administrator browses the admin area', () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(ADMIN_PATH);

    // When
    testRender(<AdminBanner />, { me: ADMIN_USER });

    // Then
    expect(screen.getByText(ADMIN_BANNER_TEXT)).toBeInTheDocument();
  });

  it.each([
    {
      scenario: 'an administrator browses a regular page',
      path: USER_PATH,
      me: ADMIN_USER,
    },
    {
      scenario: 'a standard user browses the admin area',
      path: ADMIN_PATH,
      me: STANDARD_USER,
    },
  ])(
    'should not display the admin mode banner when $scenario',
    ({ path, me }) => {
      // Given
      vi.mocked(usePathname).mockReturnValue(path);

      // When
      testRender(<AdminBanner />, { me });

      // Then
      expect(screen.queryByText(ADMIN_BANNER_TEXT)).not.toBeInTheDocument();
    }
  );
});
