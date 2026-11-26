'use client';
import { ErrorPage } from '@/components/ui/ErrorPage';
import { useTranslate } from '@/hooks/use-translate';
import { logFrontendError } from '@/lib/frontend-error-log';
import { isProduction } from '@/lib/utils';
import { useEffect } from 'react';

interface PublicPathErrorProps {
  error: Error & { digest?: string; componentStack?: string };
}

const PublicPathError = ({ error }: PublicPathErrorProps) => {
  const t = useTranslate();
  useEffect(() => {
    if (isProduction()) {
      logFrontendError(
        error.message || 'Unknown error',
        error.stack || error.name,
        error.componentStack
      );
    }
  });

  return (
    <ErrorPage>
      <p className="text-center">{t('PublicPathError.NotFound')}</p>
    </ErrorPage>
  );
};

export default PublicPathError;
