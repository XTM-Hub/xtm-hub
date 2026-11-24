import PublicPathError from '@/components/PublicPathError';
import { logFrontendError } from '@/lib/frontend-error-log';
import testRender from '@/utils/test/test-render';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/logo_xtm_hub_dark.svg', async () => {
  const React = await import('react');
  return { default: () => React.createElement('svg', { role: 'img' }) };
});

const ERROR_MESSAGE = 'Page not found';

describe('PublicPathError', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('should report the error when the application runs in production', () => {
    // Given
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    const error = new Error(ERROR_MESSAGE);

    // When
    testRender(<PublicPathError error={error} />);

    // Then
    expect(logFrontendError).toHaveBeenCalledWith(
      ERROR_MESSAGE,
      error.stack,
      undefined
    );
  });

  it('should not report the error when the application does not run in production', () => {
    // Given
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');

    // When
    testRender(<PublicPathError error={new Error(ERROR_MESSAGE)} />);

    // Then
    expect(logFrontendError).not.toHaveBeenCalled();
  });
});
