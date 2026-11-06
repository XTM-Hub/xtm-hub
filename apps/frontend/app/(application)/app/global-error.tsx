'use client';

import AppError from '@/components/AppError';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';

interface GlobalErrorProps {
  error: Error & { digest?: string; componentStack?: string };
  reset: () => void;
}

const GlobalError = ({ error, reset }: GlobalErrorProps) => {
  return (
    <html>
      <body>
        <AppError error={error} />
        <Button
          {...analyticsId('common_error_page_refresh')}
          onClick={() => reset()}>
          Try again
        </Button>
      </body>
    </html>
  );
};

export default GlobalError;
