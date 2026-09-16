import { PublicHeaderAuthButtons } from '@/components/layout/PublicHeaderAuthButtons';
import { PUBLIC_FEATURE_VOTING_PATH } from '@/utils/path/constant';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const encoded = (path: string) => encodeURIComponent(btoa(path));

describe('PublicHeaderAuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults login/sign-up to the app home on a regular public page', () => {
    vi.mocked(usePathname).mockReturnValue(
      '/en/cybersecurity-solutions/some-library'
    );

    testRender(<PublicHeaderAuthButtons />);

    expect(screen.getByText('PublicLayout.Login').closest('a')).toHaveAttribute(
      'href',
      '/auth/oidc'
    );
    expect(
      screen.getByText('PublicLayout.SignUp').closest('a')
    ).toHaveAttribute('href', '/sign-up');
  });

  it('carries the current path on the public feature-voting page', () => {
    const pathname = `/en${PUBLIC_FEATURE_VOTING_PATH}`;
    vi.mocked(usePathname).mockReturnValue(pathname);

    testRender(<PublicHeaderAuthButtons />);

    expect(screen.getByText('PublicLayout.Login').closest('a')).toHaveAttribute(
      'href',
      `/auth/oidc?redirect=${encoded(pathname)}`
    );
    expect(
      screen.getByText('PublicLayout.SignUp').closest('a')
    ).toHaveAttribute('href', `/sign-up?redirect=${encoded(pathname)}`);
  });
});
