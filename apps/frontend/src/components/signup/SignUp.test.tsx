import SignUp from '@/components/signup/SignUp';
import testRender from '@/utils/test/test-render';
import { fireEvent, screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { svgComponent } = vi.hoisted(() => ({
  svgComponent: async (label: string) => {
    const React = await import('react');
    return {
      default: () =>
        React.createElement('svg', { role: 'img', 'aria-label': label }),
    };
  },
}));

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/filigran_logo.svg', async () => svgComponent('Filigran'));
vi.mock('@public/filigran_logo_dark.svg', async () =>
  svgComponent('Filigran dark')
);
vi.mock('@public/scheme_xtm_hub_account_creation.svg', async () =>
  svgComponent('XTM Hub scheme')
);

const HUBSPOT_SCRIPT_SELECTOR = 'script[src*="hsforms.net"]';
const HUBSPOT_FORM_CONTAINER_ID = 'hubspot-form';
const EMAIL_FIELD_LABEL = 'Email';
const EMAIL_VALUE = 'jane@filigran.io';
const COUNTRY_FIELD_LABEL = 'Country';
const COUNTRY_VALUE = 'France';
const REDIRECT_PARAM = '/app/service/opencti?tab=1';

type HubspotWindow = Window & {
  hbspt?: {
    forms: { create: (options: { target: string }) => void };
  };
};

const givenRedirectParam = (redirect: string | null) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(redirect ? { redirect } : {}) as unknown as ReturnType<
      typeof useSearchParams
    >
  );
};

// Stands in for the HubSpot embed script: when it "loads", it draws a form
// with the given field markup inside the container it is given.
const givenHubspotRenders = (fieldMarkup: string) => {
  (window as HubspotWindow).hbspt = {
    forms: {
      create: ({ target }) => {
        const container = document.querySelector(target);
        container?.insertAdjacentHTML(
          'beforeend',
          `<div class="field">${fieldMarkup}</div>`
        );
      },
    },
  };
};

const givenHubspotRendersAnEmailField = () =>
  givenHubspotRenders(`<input aria-label="${EMAIL_FIELD_LABEL}" />`);

const givenHubspotRendersACountryField = () =>
  givenHubspotRenders(
    `<select aria-label="${COUNTRY_FIELD_LABEL}"><option value=""></option><option value="${COUNTRY_VALUE}">${COUNTRY_VALUE}</option></select>`
  );

const whenHubspotScriptLoads = () => {
  const script = document.querySelector(HUBSPOT_SCRIPT_SELECTOR);
  fireEvent.load(script as Element);
};

describe('SignUp', () => {
  afterEach(() => {
    delete (window as HubspotWindow).hbspt;
  });

  it('should present the sign up page to a new visitor', () => {
    // Given / When
    testRender(<SignUp />);

    // Then
    expect(
      screen.getByRole('heading', { level: 1, name: /Title1\s*Title2/ })
    ).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'WelcomeSubtitle' })
    ).toBeInTheDocument();
  });

  it.each([
    ['without redirect', null, '/auth/oidc'],
    [
      'with the redirect kept',
      REDIRECT_PARAM,
      `/auth/oidc?redirect=${encodeURIComponent(REDIRECT_PARAM)}`,
    ],
  ])(
    'should send an existing user to single sign-on %s',
    (_title, redirect, expectedHref) => {
      // Given
      givenRedirectParam(redirect);

      // When
      testRender(<SignUp />);

      // Then
      expect(screen.getByRole('link', { name: 'LogIn' })).toHaveAttribute(
        'href',
        expectedHref
      );
    }
  );

  it('should not offer the local login by default', () => {
    // Given / When
    testRender(<SignUp />);

    // Then
    expect(
      screen.queryByRole('link', { name: 'LoginWithLocal' })
    ).not.toBeInTheDocument();
  });

  it.each([
    ['without redirect', null, '/login'],
    [
      'with the redirect kept',
      REDIRECT_PARAM,
      `/login?redirect=${encodeURIComponent(REDIRECT_PARAM)}`,
    ],
  ])(
    'should offer the local login %s when it is enabled',
    (_title, redirect, expectedHref) => {
      // Given
      givenRedirectParam(redirect);

      // When
      testRender(<SignUp showLocalLogin />);

      // Then
      expect(
        screen.getByRole('link', { name: 'LoginWithLocal' })
      ).toHaveAttribute('href', expectedHref);
    }
  );

  it('should show the registration form once the HubSpot script has loaded', () => {
    // Given
    givenHubspotRendersAnEmailField();
    testRender(<SignUp />);
    expect(screen.queryByLabelText(EMAIL_FIELD_LABEL)).not.toBeInTheDocument();

    // When
    whenHubspotScriptLoads();

    // Then
    const container = document.getElementById(HUBSPOT_FORM_CONTAINER_ID);
    expect(container).toContainElement(
      screen.getByLabelText(EMAIL_FIELD_LABEL)
    );
  });

  it('should not break the page when the HubSpot script loads without exposing its form builder', () => {
    // Given
    testRender(<SignUp />);

    // When
    whenHubspotScriptLoads();

    // Then
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(screen.queryByLabelText(EMAIL_FIELD_LABEL)).not.toBeInTheDocument();
  });

  it('should flag a form field as filled when the visitor types in it and unflag it once emptied', () => {
    // Given
    givenHubspotRendersAnEmailField();
    testRender(<SignUp />);
    whenHubspotScriptLoads();
    const emailField = screen.getByLabelText(EMAIL_FIELD_LABEL);
    const fieldWrapper = emailField.closest('.field');

    // When
    fireEvent.input(emailField, { target: { value: EMAIL_VALUE } });

    // Then
    expect(fieldWrapper).toHaveClass('has-value');

    // When
    fireEvent.input(emailField, { target: { value: '' } });

    // Then
    expect(fieldWrapper).not.toHaveClass('has-value');
  });

  it('should flag a select field as filled when the visitor picks an option and unflag it once cleared', () => {
    // Given
    givenHubspotRendersACountryField();
    testRender(<SignUp />);
    whenHubspotScriptLoads();
    const countryField = screen.getByLabelText(COUNTRY_FIELD_LABEL);
    const fieldWrapper = countryField.closest('.field');

    // When
    fireEvent.change(countryField, { target: { value: COUNTRY_VALUE } });

    // Then
    expect(fieldWrapper).toHaveClass('has-value');

    // When
    fireEvent.change(countryField, { target: { value: '' } });

    // Then
    expect(fieldWrapper).not.toHaveClass('has-value');
  });

  it('should stop loading the HubSpot script when the visitor leaves the page', () => {
    // Given
    const { unmount } = testRender(<SignUp />);
    expect(document.querySelector(HUBSPOT_SCRIPT_SELECTOR)).toBeInTheDocument();

    // When
    unmount();

    // Then
    expect(
      document.querySelector(HUBSPOT_SCRIPT_SELECTOR)
    ).not.toBeInTheDocument();
  });
});
