'use client';

import AppError from '@/components/AppError';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/ui';

interface HuntPackLoadErrorProps {
  error: unknown;
  retrying: boolean;
  onRetry: () => void;
}

const HuntPackLoadError = ({
  error,
  retrying,
  onRetry,
}: HuntPackLoadErrorProps) => {
  const t = useTranslate();

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-m">
      <AppError error={error instanceof Error ? error : new Error()} />
      <Button
        variant="secondary"
        disabled={retrying}
        onClick={onRetry}>
        {t('Error.TryAgain')}
      </Button>
    </div>
  );
};

export default HuntPackLoadError;
