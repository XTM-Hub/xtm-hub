import { ProfileFormPreferences } from '@/components/profile/form/Preferences';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import { meKeys } from '@graphql/me/me.keys';
import { mockUser } from '@graphql/mocks';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SELECTED_LANGUAGE = 'ja';
const EDITED_USER = mockUser({ id: 'user-1' });

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  useMeLanguageEditMutation: vi.fn(),
  setUserLocale: vi.fn(),
}));

vi.mock('@/i18n/locale', () => ({
  setUserLocale: mocks.setUserLocale,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: undefined,
    setTheme: mocks.setTheme,
  }),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMeLanguageEditMutation: mocks.useMeLanguageEditMutation,
}));

vi.mock('@filigran/design-system', async () => {
  const actual = await vi.importActual<
    typeof import('@filigran/design-system')
  >('@filigran/design-system');

  return {
    ...actual,
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (nextValue: string) => void;
      children: ReactNode;
    }) => (
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}>
        {children}
      </select>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => children,
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: ReactNode;
    }) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: { children: ReactNode }) => children,
    SelectValue: () => null,
  };
});

describe('ProfileFormPreferences', () => {
  let editLanguage: ReturnType<typeof mockMutationHook>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setUserLocale.mockResolvedValue(undefined);
    editLanguage = mockMutationHook(
      mocks.useMeLanguageEditMutation,
      'success',
      {
        data: { editMeUser: EDITED_USER },
      }
    );
  });

  it('should render the preference sections', () => {
    testRender(<ProfileFormPreferences />);

    expect(
      screen.getByText('ProfilePage.Preferences.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('ProfilePage.Preferences.Theme')
    ).toBeInTheDocument();
    expect(
      screen.getByText('ProfilePage.Preferences.Language')
    ).toBeInTheDocument();
  });

  it('should use dark theme by default when theme is undefined', () => {
    testRender(<ProfileFormPreferences />);

    expect(screen.getByText('ThemeToggle.Dark')).toBeInTheDocument();
  });

  it('should call setTheme when changing the theme', async () => {
    const { user } = testRender(<ProfileFormPreferences />);

    const [themeSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(themeSelect, 'light');

    expect(mocks.setTheme).toHaveBeenCalledWith('light');
  });

  it('should update locale and persist selected language on locale change', async () => {
    const { user } = testRender(<ProfileFormPreferences />);

    const [, localeSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(localeSelect, SELECTED_LANGUAGE);

    expect(mocks.setUserLocale).toHaveBeenCalledWith(SELECTED_LANGUAGE);
    expect(editLanguage).toHaveBeenCalledWith({
      selected_language: SELECTED_LANGUAGE,
    });
  });

  it('should give the returned user to the user context when the language is saved', async () => {
    // Given
    const queryClient = new QueryClient();
    const { user } = testRender(<ProfileFormPreferences />, { queryClient });
    const [, localeSelect] = screen.getAllByRole('combobox');

    // When
    await user.selectOptions(localeSelect, SELECTED_LANGUAGE);

    // Then
    await waitFor(() =>
      expect(queryClient.getQueryData(meKeys.detail())).toEqual({
        me: EDITED_USER,
      })
    );
  });

  it('should display fr locale outside development environment', () => {
    testRender(<ProfileFormPreferences />);

    expect(
      screen.getByRole('option', { name: 'LocaleSwitcher.fr' })
    ).toBeInTheDocument();
  });
});
