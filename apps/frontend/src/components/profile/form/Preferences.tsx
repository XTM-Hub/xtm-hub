'use client';

import { setCurrentUser } from '@/components/me/current-user-query';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { SelectField } from '@/components/ui/SelectField';
import { useTranslate } from '@/hooks/use-translate';
import { Locale, locales, publicLocales } from '@/i18n/config';
import { setUserLocale } from '@/i18n/locale';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@filigran/design-system';
import { useMeEditMutation } from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { useContext } from 'react';

export const ProfileFormPreferences = () => {
  const t = useTranslate();
  const { settings } = useContext(SettingsContext);
  const isDevelopmentEnvSetting = settings?.environment === 'development';
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { mutate: editMeUser } = useMeEditMutation(portalGraphqlClient, {
    onSuccess: ({ editMeUser: user }) => setCurrentUser(queryClient, user),
  });
  const availableLocales = isDevelopmentEnvSetting ? locales : publicLocales;

  const onLocaleChange = (value: string) => {
    void setUserLocale(value as Locale);
    editMeUser({
      first_name: null,
      last_name: null,
      country: null,
      selected_language: value,
    });
  };

  const currentTheme = theme ?? 'dark';

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">{t('ProfilePage.Preferences.Title')}</CardTitle>
      </CardHeader>
      <CardContent
        clamp={0}
        className="grid gap-4">
        <SelectField
          analyticsId="account_themes_open"
          label={t('ProfilePage.Preferences.Theme')}
          placeholder={t('ThemeToggle.SetTheme')}
          options={[
            { value: 'light', label: t('ThemeToggle.Light') },
            { value: 'dark', label: t('ThemeToggle.Dark') },
            { value: 'system', label: t('ThemeToggle.Automatic') },
          ]}
          value={currentTheme}
          onValueChange={setTheme}
          // The card is layer 1, where a layer-1 panel paints the input colour.
          contentClassName="layer-0"
        />

        <SelectField
          analyticsId="account_languages_open"
          label={t('ProfilePage.Preferences.Language')}
          placeholder={t('LocaleSwitcher.Label')}
          options={availableLocales.map((loc) => ({
            value: loc,
            label: t(`LocaleSwitcher.${loc}`),
          }))}
          value={locale}
          onValueChange={onLocaleChange}
          contentClassName="layer-0"
        />
      </CardContent>
    </Card>
  );
};
