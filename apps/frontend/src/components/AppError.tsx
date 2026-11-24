'use client';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { logFrontendError } from '@/lib/frontend-error-log';
import { useContext, useEffect } from 'react';

const AppError = ({
  error,
}: {
  error: Error & { digest?: string; componentStack?: string };
}) => {
  const { settings } = useContext(SettingsContext);
  const isDevelopmentEnvSetting =
    settings?.environment && settings.environment !== 'production';
  const t = useTranslate();
  useEffect(() => {
    if (isDevelopmentEnvSetting) {
      logFrontendError(
        error.message || 'Unknown error',
        error.stack,
        error.componentStack
      );
    }
  });

  const getSpecificMessageError = t(`Error.Server.${error.message}`);
  const displayedMessage = getSpecificMessageError.startsWith('Error.Server.')
    ? t('Error.AnErrorOccured')
    : getSpecificMessageError;

  return (
    <div>
      <h2>{t('Error.SomethingWentWrong')}</h2>
      <p>{error.message ? displayedMessage : t('Error.AnErrorOccured')}</p>
      {isDevelopmentEnvSetting && (
        <div>
          {t(`Error.Server.${error.message}`)}
          <pre>{error.stack}</pre>
        </div>
      )}
    </div>
  );
};

export default AppError;
