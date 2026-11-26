import {
  CookieConsentProvider,
  useConsent,
} from '@/components/cookie-consent/CookieConsentProvider';
import { CookieSettingsLink } from '@/components/cookie-consent/CookieSettingsLink';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const LINK_CLASS_NAME = 'text-footer-link';

const PreferencesState = () => {
  const { isPreferencesOpen } = useConsent();
  return <span data-testid="preferences">{String(isPreferencesOpen)}</span>;
};

describe('CookieSettingsLink', () => {
  it('should render a button labelled with the cookie settings i18n key', () => {
    // Given / When
    testRender(
      <CookieConsentProvider initialConsent={null}>
        <CookieSettingsLink />
      </CookieConsentProvider>
    );

    // Then
    expect(
      screen.getByRole('button', { name: 'CookieSettingsLink' })
    ).toBeInTheDocument();
  });

  it('should apply the given class name', () => {
    // Given / When
    testRender(
      <CookieConsentProvider initialConsent={null}>
        <CookieSettingsLink className={LINK_CLASS_NAME} />
      </CookieConsentProvider>
    );

    // Then
    expect(
      screen.getByRole('button', { name: 'CookieSettingsLink' })
    ).toHaveClass(LINK_CLASS_NAME);
  });

  it('should open the cookie preferences when clicked', async () => {
    // Given
    const { user } = testRender(
      <CookieConsentProvider initialConsent={null}>
        <CookieSettingsLink />
        <PreferencesState />
      </CookieConsentProvider>
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'CookieSettingsLink' })
    );

    // Then
    expect(screen.getByTestId('preferences')).toHaveTextContent('true');
  });
});
