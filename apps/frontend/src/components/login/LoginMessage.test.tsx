import LoginMessage from '@/components/login/LoginMessage';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { ReadonlyURLSearchParams, useSearchParams } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

describe('LoginMessage', () => {
  it('should invite visitors without an account to sign up', () => {
    // Given / When
    testRender(<LoginMessage />);

    // Then
    expect(screen.getByText(/LoginPage\.DontHaveAccount/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'LoginPage.SignUp' })
    ).toHaveAttribute('href', '/sign-up');
  });

  it.each([
    ['a plain path', '/app/service/opencti'],
    ['a base64 value with padding', 'L2FwcC9zZXJ2aWNlP3g9MQ=='],
    ['a base64 value with a plus sign', 'Pz8+Pz8/'],
  ])(
    'should keep the requested redirection on the sign up link when it is %s',
    (_title, redirect) => {
      // Given
      vi.mocked(useSearchParams).mockReturnValue(
        new ReadonlyURLSearchParams({ redirect })
      );

      // When
      testRender(<LoginMessage />);

      // Then
      const href = screen
        .getByRole('link', { name: 'LoginPage.SignUp' })
        .getAttribute('href');
      const url = new URL(href ?? '', 'http://localhost');
      expect(url.searchParams.get('redirect')).toBe(redirect);
    }
  );
});
