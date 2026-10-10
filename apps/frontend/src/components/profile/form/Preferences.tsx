'use client';

import { MeEditUserMutation } from '@/components/me/me.graphql';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { SelectField } from '@/components/ui/SelectField';
import { useTranslate } from '@/hooks/use-translate';
import { Locale, locales, publicLocales } from '@/i18n/config';
import { setUserLocale } from '@/i18n/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@filigran/design-system';
import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { useContext } from 'react';
import { useMutation } from 'react-relay';

export const ProfileFormPreferences = () => {
  const t = useTranslate();
  const { settings } = useContext(SettingsContext);
  const isDevelopmentEnvSetting = settings?.environment === 'development';
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const [commitEditMeUserMutation] = useMutation(MeEditUserMutation);
  const availableLocales = isDevelopmentEnvSetting ? locales : publicLocales;

  const onLocaleChange = (value: string) => {
    void setUserLocale(value as Locale);
    commitEditMeUserMutation({ variables: { selected_language: value } });
  };

  const currentTheme = theme ?? 'dark';

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">{t('ProfilePage.Preferences.Title')}</CardTitle>
      </CardHeader>
      <CardContent
        clamp={0}
        className="grid gap-l">
        <SelectField
          label={t('ProfilePage.Preferences.Theme')}
          placeholder={t('ThemeToggle.SetTheme')}
          options={[
            { value: 'light', label: t('ThemeToggle.Light') },
            { value: 'dark', label: t('ThemeToggle.Dark') },
            { value: 'system', label: t('ThemeToggle.Automatic') },
          ]}
          value={currentTheme}
          onValueChange={setTheme}
        />

        <SelectField
          label={t('ProfilePage.Preferences.Language')}
          placeholder={t('LocaleSwitcher.Label')}
          options={availableLocales.map((loc) => ({
            value: loc,
            label: t(`LocaleSwitcher.${loc}`),
          }))}
          value={locale}
          onValueChange={onLocaleChange}
        />
      </CardContent>
    </Card>
  );
};
