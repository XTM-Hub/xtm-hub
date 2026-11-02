import { ProfileFormEdit } from '@/components/profile/form/Edit';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const FIRST_NAME = 'Ada';
const LAST_NAME = 'Lovelace';
const COUNTRY = 'France';
const OTHER_COUNTRY = 'Germany';

const ME = { first_name: FIRST_NAME, last_name: LAST_NAME, country: COUNTRY };

const getFirstNameInput = () =>
  screen.getByRole('textbox', { name: 'UserForm.FirstName' });
const getLastNameInput = () =>
  screen.getByRole('textbox', { name: 'UserForm.LastName' });
const getCountryInput = () =>
  screen.getByRole('combobox', { name: 'UserForm.Country' });
const getUpdateButton = () =>
  screen.getByRole('button', { name: 'ProfilePage.UpdateProfile' });

describe('ProfileFormEdit', () => {
  it('should prefill the form with the identity of the signed-in user', async () => {
    // Given / When
    testRender(<ProfileFormEdit onSubmit={vi.fn()} />, { me: ME });

    // Then
    expect(screen.getByText('ProfilePage.Title')).toBeInTheDocument();
    await waitFor(() => expect(getFirstNameInput()).toHaveValue(FIRST_NAME));
    expect(getLastNameInput()).toHaveValue(LAST_NAME);
    expect(getCountryInput()).toHaveValue(COUNTRY);
  });

  it('should submit the edited names and the unchanged country when the user updates their name', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<ProfileFormEdit onSubmit={onSubmit} />, {
      me: ME,
    });
    await waitFor(() => expect(getFirstNameInput()).toHaveValue(FIRST_NAME));

    // When
    await user.clear(getFirstNameInput());
    await user.type(getFirstNameInput(), 'Grace');
    await user.clear(getLastNameInput());
    await user.type(getLastNameInput(), 'Hopper');
    await user.click(getUpdateButton());

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        first_name: 'Grace',
        last_name: 'Hopper',
        country: COUNTRY,
      })
    );
  });

  it('should submit the newly selected country when the user picks another one', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<ProfileFormEdit onSubmit={onSubmit} />, {
      me: ME,
    });
    await waitFor(() => expect(getCountryInput()).toHaveValue(COUNTRY));

    // When
    await user.click(
      screen.getByRole('button', {
        name: 'DesignSystem.Combobox.ToggleOptions',
      })
    );
    await user.click(
      await screen.findByRole('option', { name: OTHER_COUNTRY })
    );
    await user.click(getUpdateButton());

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        first_name: FIRST_NAME,
        last_name: LAST_NAME,
        country: OTHER_COUNTRY,
      })
    );
  });

  it('should submit with no country when the user has none and leaves the field empty', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = testRender(<ProfileFormEdit onSubmit={onSubmit} />, {
      me: { ...ME, country: null },
    });
    await waitFor(() => expect(getFirstNameInput()).toHaveValue(FIRST_NAME));

    // When
    await user.click(getUpdateButton());

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        first_name: FIRST_NAME,
        last_name: LAST_NAME,
        country: null,
      })
    );
  });
});
