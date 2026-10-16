import LoginMessage from '@/components/login/LoginMessage';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
