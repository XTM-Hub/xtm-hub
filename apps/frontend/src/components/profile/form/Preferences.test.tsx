import { ProfileFormPreferences } from '@/components/profile/form/Preferences';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  commitEditMeUserMutation: vi.fn(),
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

vi.mock('react-relay', () => ({
  useMutation: () => [mocks.commitEditMeUserMutation],
}));

vi.mock('@filigran/ui', async () => {
  const actual =
    await vi.importActual<typeof import('@filigran/ui')>('@filigran/ui');

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setUserLocale.mockResolvedValue(undefined);
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
    await user.selectOptions(localeSelect, 'ja');

    expect(mocks.setUserLocale).toHaveBeenCalledWith('ja');
    expect(mocks.commitEditMeUserMutation).toHaveBeenCalledWith({
      variables: { selected_language: 'ja' },
    });
  });

  it('should display fr locale outside development environment', () => {
    testRender(<ProfileFormPreferences />);

    expect(
      screen.getByRole('option', { name: 'LocaleSwitcher.fr' })
    ).toBeInTheDocument();
  });
});
