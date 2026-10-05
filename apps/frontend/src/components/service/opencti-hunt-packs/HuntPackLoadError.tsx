'use client';

import AppError from '@/components/AppError';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';

interface HuntPackLoadErrorProps {
  error: unknown;
  /** What could not be loaded, e.g. "The hunt packs could not be loaded." */
  description: string;
  retrying: boolean;
  onRetry: () => void;
}

const HuntPackLoadError = ({
  error,
  description,
  retrying,
  onRetry,
}: HuntPackLoadErrorProps) => {
  const t = useTranslate();

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-m">
      <AppError
        error={error instanceof Error ? error : new Error()}
        description={description}
      />
      <Button
        priority="secondary"
        disabled={retrying}
        onClick={onRetry}>
        {t('Error.TryAgain')}
      </Button>
    </div>
  );
};

export default HuntPackLoadError;
