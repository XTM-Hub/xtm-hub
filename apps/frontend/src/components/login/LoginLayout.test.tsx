import { LoginLayout } from '@/components/login/LoginLayout';
import { AppSnackbars } from '@/components/ui/snackbar/AppSnackbars';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/logo_xtm_hub_dark.svg', async () => {
  const React = await import('react');
  return { default: () => React.createElement('svg', { role: 'img' }) };
});

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
    ...vi.mocked(useRouter)(),
    replace,
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

  it('should keep the visitor on the login page when local login is enabled', async () => {
    // Given
    const replace = givenRouterReplace();

    // When
    testRender(<LoginLayout />);

    // Then
    await waitFor(() => expect(replace).not.toHaveBeenCalled());
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

  it.each([
    ['a plain path', '/app/service/opencti'],
    ['a path with a query string', '/app/service/opencti?tab=1&x=2'],
    ['a base64 value with padding', 'L2FwcC9zZXJ2aWNlP3g9MQ=='],
    ['a base64 value with a plus sign', 'Pz8+Pz8/'],
  ])(
    'should keep the requested redirection intact when it is %s and the visitor is sent to the sign up page',
    (_title, redirect) => {
      // Given
      givenQueryParams({ redirect });
      const replace = givenRouterReplace();

      // When
      testRender(<LoginLayout />, { settings: OIDC_ONLY_SETTINGS });

      // Then
      const [target] = replace.mock.calls[0];
      const url = new URL(target, 'http://localhost');
      expect(url.pathname).toBe('/sign-up');
      expect(url.searchParams.get('redirect')).toBe(redirect);
    }
  );

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
