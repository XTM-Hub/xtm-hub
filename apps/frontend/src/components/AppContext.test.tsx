import AppContext from '@/components/AppContext';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@app/font', () => ({
  geologica: { variable: 'geologica' },
  ibmPlexSans: { variable: 'ibm-plex-sans' },
}));
// The managed scripts load third-party code and have their own consent tests.
vi.mock('@/components/cookie-consent/ManagedScripts', () => ({
  ManagedScripts: () => <div data-testid="managed-scripts" />,
}));
// next-themes reads window.matchMedia, which jsdom lacks.
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/components/cookie-consent/CookieConsent', () => ({
  CookieConsent: () => <div data-testid="cookie-consent" />,
}));

const renderAppContext = (loadThirdPartyScripts: boolean) =>
  testRender(
    <AppContext loadThirdPartyScripts={loadThirdPartyScripts}>
      <div data-testid="page" />
    </AppContext>
  );

describe('AppContext', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it.each`
    loadThirdPartyScripts | expected
    ${true}               | ${true}
    ${false}              | ${false}
  `(
    'should render the managed scripts: $expected when loadThirdPartyScripts is $loadThirdPartyScripts',
    ({ loadThirdPartyScripts, expected }) => {
      // Given / When
      renderAppContext(loadThirdPartyScripts);

      // Then
      expect(!!screen.queryByTestId('managed-scripts')).toBe(expected);
      expect(screen.getByTestId('page')).toBeInTheDocument();
      expect(screen.getByTestId('cookie-consent')).toBeInTheDocument();
    }
  );
});
