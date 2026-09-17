import { PublicXtmPlatformTrialPanel } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/PublicXtmPlatformTrialPanel';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => Object.assign((key: string) => key, {}),
}));

describe('PublicXtmPlatformTrialPanel', () => {
  it('renders the not-logged-in message with login and sign-up actions', async () => {
    render(await PublicXtmPlatformTrialPanel());

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.NotLoggedIn.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.NotLoggedIn.Description'
      )
    ).toBeInTheDocument();

    const expectedRedirect = encodeURIComponent(
      btoa('/app/service/xtm-platform-trial')
    );

    const loginLink = screen.getByRole('link', {
      name: 'PublicLayout.Login',
    });
    expect(loginLink).toHaveAttribute(
      'href',
      `/auth/oidc?redirect=${expectedRedirect}`
    );

    const signUpLink = screen.getByRole('link', {
      name: 'PublicLayout.SignUp',
    });
    expect(signUpLink).toHaveAttribute(
      'href',
      `/sign-up?redirect=${expectedRedirect}`
    );
  });
});
