import { PublicHeaderAuthButtons } from '@/components/layout/PublicHeaderAuthButtons';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const encodedCounterpartTarget = (pathname: string) =>
  encodeURIComponent(
    btoa(`/redirect/public?path=${encodeURIComponent(pathname)}`)
  );

describe('PublicHeaderAuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['/en', '/fr'])(
    'should send login and sign-up to the app home on the %s homepage',
    (pathname) => {
      // Given
      vi.mocked(usePathname).mockReturnValue(pathname);

      // When
      testRender(<PublicHeaderAuthButtons />);

      // Then
      expect(
        screen.getByText('PublicLayout.Login').closest('a')
      ).toHaveAttribute('href', '/auth/oidc');
      expect(
        screen.getByText('PublicLayout.SignUp').closest('a')
      ).toHaveAttribute('href', '/sign-up');
    }
  );

  it.each([
    {
      page: 'library',
      pathname: '/en/cybersecurity-solutions/opencti-integrations',
    },
    {
      page: 'resource',
      pathname: '/en/cybersecurity-solutions/opencti-integrations/crowdstrike',
    },
    {
      page: 'roadmap',
      pathname: '/fr/cybersecurity-solutions/xtm-platform-roadmap',
    },
    {
      page: 'feature voting',
      pathname:
        '/en/cybersecurity-solutions/xtm-platform-roadmap/feature-voting',
    },
  ])(
    'should send login and sign-up back to the private counterpart of the $page page',
    ({ pathname }) => {
      // Given
      vi.mocked(usePathname).mockReturnValue(pathname);
      const encodedTarget = encodedCounterpartTarget(pathname);

      // When
      testRender(<PublicHeaderAuthButtons />);

      // Then
      expect(
        screen.getByText('PublicLayout.Login').closest('a')
      ).toHaveAttribute('href', `/auth/oidc?redirect=${encodedTarget}`);
      expect(
        screen.getByText('PublicLayout.SignUp').closest('a')
      ).toHaveAttribute('href', `/sign-up?redirect=${encodedTarget}`);
    }
  );
});
