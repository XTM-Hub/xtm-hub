'use client';

import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';

interface ServiceLoadErrorProps {
  message: string;
  onRetry: () => void;
}

export const ServiceLoadError = ({
  message,
  onRetry,
}: ServiceLoadErrorProps) => {
  const t = useTranslate();

  return (
    <div
      role="alert"
      className="my-4 flex flex-col items-center gap-3 text-center">
      <p>{message}</p>
      <Button
        priority="secondary"
        onClick={onRetry}>
        {t('Service.List.Retry')}
      </Button>
    </div>
  );
};
