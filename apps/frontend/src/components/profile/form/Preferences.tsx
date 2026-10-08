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
  SelectLabel,
  SelectTrigger,
  SelectValue,
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
        <div>
          <Select
            value={currentTheme}
            onValueChange={setTheme}>
            <SelectLabel>{t('ProfilePage.Preferences.Theme')}</SelectLabel>
            <SelectTrigger className="w-full">
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

        <div>
          <Select
            value={locale}
            onValueChange={onLocaleChange}>
            <SelectLabel>{t('ProfilePage.Preferences.Language')}</SelectLabel>
            <SelectTrigger className="w-full">
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
