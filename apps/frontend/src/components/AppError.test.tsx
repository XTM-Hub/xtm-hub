import AppError from '@/components/AppError';
import { logFrontendError } from '@/lib/frontend-error-log';
import testRender from '@/utils/test/test-render';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ERROR_MESSAGE = 'Something broke';

const buildError = () => new Error(ERROR_MESSAGE);

describe('AppError', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should report the error when the platform is not in production', () => {
    // Given
    const error = buildError();

    // When
    testRender(<AppError error={error} />, {
      settings: { environment: 'staging' },
    });

    // Then
    expect(logFrontendError).toHaveBeenCalledWith(
      ERROR_MESSAGE,
      error.stack,
      undefined
    );
  });

  it('should not report the error when the platform is in production', () => {
    // Given
    const error = buildError();

    // When
    testRender(<AppError error={error} />, {
      settings: { environment: 'production' },
    });

    // Then
    expect(logFrontendError).not.toHaveBeenCalled();
  });
});
