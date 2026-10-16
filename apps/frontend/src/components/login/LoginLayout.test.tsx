import { LoginLayout } from '@/components/login/LoginLayout';
import { AppSnackbars } from '@/components/ui/snackbar/AppSnackbars';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/logo_xtm_hub_dark.svg', async () => {
  const React = await import('react');
  return { default: () => React.createElement('svg', { role: 'img' }) };
});

const REDIRECT_PARAM = 'L2FwcC9zZXJ2aWNl';
const OIDC_ONLY_SETTINGS = {
  platform_providers: [{ name: 'Login', provider: 'oidc', type: 'SSO' }],
};

const givenQueryParams = (params: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(params) as unknown as ReturnType<typeof useSearchParams>
  );
};

const givenRouterReplace = () => {
  const replace = vi.fn();
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  });
  return replace;
};

describe('LoginLayout', () => {
  it('should let a visitor log in with their email and password when local login is enabled', () => {
    // Given / When
    testRender(<LoginLayout />);

    // Then
    expect(
      screen.getByRole('heading', { name: 'LoginPage.Title' })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('LoginPage.Email')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('LoginPage.Password')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'LoginPage.SignIn' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'LoginPage.SignUp' })
    ).toBeInTheDocument();
  });

  it('should keep the visitor on the login page when local login is enabled', () => {
    // Given
    const replace = givenRouterReplace();

    // When
    testRender(<LoginLayout />);

    // Then
    expect(replace).not.toHaveBeenCalled();
  });

  it('should show nothing when local login is not enabled', () => {
    // Given
    givenRouterReplace();

    // When
    testRender(<LoginLayout />, { settings: OIDC_ONLY_SETTINGS });

    // Then
    expect(
      screen.queryByRole('button', { name: 'LoginPage.SignIn' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'LoginPage.Title' })
    ).not.toBeInTheDocument();
  });

  it('should send the visitor to the sign up page when local login is not enabled', () => {
    // Given
    const replace = givenRouterReplace();

    // When
    testRender(<LoginLayout />, { settings: OIDC_ONLY_SETTINGS });

    // Then
    expect(replace).toHaveBeenCalledExactlyOnceWith('/sign-up');
  });

  it('should keep the requested redirection when sending the visitor to the sign up page', () => {
    // Given
    givenQueryParams({ redirect: REDIRECT_PARAM });
    const replace = givenRouterReplace();

    // When
    testRender(<LoginLayout />, { settings: OIDC_ONLY_SETTINGS });

    // Then
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      `/sign-up?redirect=${REDIRECT_PARAM}`
    );
  });

  it('should warn the visitor when the login came back with an error', async () => {
    // Given
    givenQueryParams({ error: 'access_denied' });

    // When
    testRender(
      <AppSnackbars>
        <LoginLayout />
      </AppSnackbars>
    );

    // Then
    expect(
      await screen.findByText('UnexpectedErrorDialog.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('UnexpectedErrorDialog.Description')
    ).toBeInTheDocument();
  });
});
