'use client';
import { logFrontendError } from '@/components/error-frontend-log.graphql';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { useContext, useEffect } from 'react';
import { useRelayEnvironment } from 'react-relay';

const AppError = ({
  error,
}: {
  error: Error & { digest?: string; componentStack?: string };
}) => {
  const { settings } = useContext(SettingsContext);
  const isDevelopmentEnvSetting =
    settings?.environment && settings.environment !== 'production';
  const environment = useRelayEnvironment();
  const t = useTranslate();
  useEffect(() => {
    if (isDevelopmentEnvSetting) {
      logFrontendError(
        environment,
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
