'use client';

import { MeEditUserMutation } from '@/components/me/me.graphql';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { Locale, locales, publicLocales } from '@/i18n/config';
import { setUserLocale } from '@/i18n/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/ui';
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
        <CardTitle className="heading-lg">
          {t('ProfilePage.Preferences.Title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-l">
        <div className="grid gap-s">
          <span className="txt-default">
            {t('ProfilePage.Preferences.Theme')}
          </span>
          <Select
            value={currentTheme}
            onValueChange={setTheme}>
            <SelectTrigger aria-label={t('ThemeToggle.SetTheme')}>
              <SelectValue placeholder={t('ThemeToggle.SetTheme')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t('ThemeToggle.Light')}</SelectItem>
              <SelectItem value="dark">{t('ThemeToggle.Dark')}</SelectItem>
              <SelectItem value="system">
                {t('ThemeToggle.Automatic')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-s">
          <span className="txt-default">
            {t('ProfilePage.Preferences.Language')}
          </span>
          <Select
            value={locale}
            onValueChange={onLocaleChange}>
            <SelectTrigger aria-label={t('LocaleSwitcher.Label')}>
              <SelectValue placeholder={t('LocaleSwitcher.Label')} />
            </SelectTrigger>
            <SelectContent>
              {availableLocales.map((loc) => (
                <SelectItem
                  key={loc}
                  value={loc}>
                  {t(`LocaleSwitcher.${loc}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
