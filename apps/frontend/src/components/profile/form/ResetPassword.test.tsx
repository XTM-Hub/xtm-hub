import { ProfileFormResetPassword } from '@/components/profile/form/ResetPassword';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('ProfileFormResetPassword', () => {
  it('should explain how the password reset works when the user opens their profile', () => {
    // Given / When
    testRender(<ProfileFormResetPassword onSubmit={vi.fn()} />);

    // Then
    expect(screen.getByText('UserForm.Password')).toBeInTheDocument();
    expect(
      screen.getByText('UserForm.ResetPassword.Sentence')
    ).toBeInTheDocument();
  });

  it('should request a password reset when the user clicks the reset action', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(
      <ProfileFormResetPassword onSubmit={onSubmit} />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'UserForm.ResetPassword.Action' })
    );

    // Then
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
