import { portalGraphqlClient } from '@/lib/graphql-client';
import { useFrontendErrorLogMutation } from '@graphql/generated';
import { afterEach, describe, expect, it, vi } from 'vitest';

// setup-vitest.ts mocks this module for every other test file.
vi.unmock('@/lib/frontend-error-log');

const { logFrontendError } = await import('@/lib/frontend-error-log');

const MESSAGE = 'Something broke';
const CODE_STACK = 'Error: Something broke\n    at render';
const COMPONENT_STACK = '    at AppError';

const mockFetcher = (request: () => Promise<unknown>) =>
  vi
    .spyOn(useFrontendErrorLogMutation, 'fetcher')
    .mockReturnValue(
      request as ReturnType<typeof useFrontendErrorLogMutation.fetcher>
    );

describe('logFrontendError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [
      'the stacks when they are given',
      CODE_STACK,
      COMPONENT_STACK,
      { codeStack: CODE_STACK, componentStack: COMPONENT_STACK },
    ],
    [
      'null stacks when they are missing',
      undefined,
      undefined,
      { codeStack: null, componentStack: null },
    ],
  ])(
    'should send the message with %s',
    (_label, codeStack, componentStack, expectedStacks) => {
      // Given
      const fetcher = mockFetcher(vi.fn().mockResolvedValue({}));

      // When
      logFrontendError(MESSAGE, codeStack, componentStack);

      // Then
      expect(fetcher).toHaveBeenCalledWith(portalGraphqlClient, {
        message: MESSAGE,
        ...expectedStacks,
      });
    }
  );

  it('should resolve without error when the request fails', async () => {
    // Given
    mockFetcher(vi.fn().mockRejectedValue(new Error('Network down')));

    // When
    const report = logFrontendError(MESSAGE);

    // Then
    await expect(report).resolves.toBeUndefined();
  });
});
