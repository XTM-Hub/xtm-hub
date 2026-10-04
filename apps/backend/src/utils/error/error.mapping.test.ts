import { isInstance } from 'apollo-errors';
import { describe, expect, it } from 'vitest';
import { ErrorCode, UnknownErrorCode } from './error.code';
import { mapToGraphQLError } from './error.mapping';
import { ErrorCategory } from './error.type';

describe('error mapping', () => {
  describe('mapToGraphQLError', () => {
    it('should return mapped error when error is known', () => {
      const error = new Error(ErrorCode.InvalidPlatformConfiguration);

      const builtError = mapToGraphQLError(error);

      const isApolloErrorInstance = isInstance(builtError);
      expect(isApolloErrorInstance).toBeTruthy();

      expect(builtError.data.http_status).toBe(400);
      expect(builtError.data.genre).toBe(ErrorCategory.BadRequest);
      expect(builtError.message).toBe(ErrorCode.InvalidPlatformConfiguration);
    });

    it('should return a retryable too many requests error for a rate limit code', () => {
      const error = new Error(ErrorCode.CoverageSearchRateLimited);

      const builtError = mapToGraphQLError(error);

      expect(isInstance(builtError)).toBeTruthy();
      expect(builtError.data.http_status).toBe(429);
      expect(builtError.data.genre).toBe(ErrorCategory.BadRequest);
      expect(builtError.message).toBe(ErrorCode.CoverageSearchRateLimited);
      expect(builtError._logLevel).toBe('warn');
    });

    it('should return unknown error when error is unknown', () => {
      const error = new Error('Hello');

      const builtError = mapToGraphQLError(error);

      const isApolloErrorInstance = isInstance(builtError);
      expect(isApolloErrorInstance).toBeTruthy();

      expect(builtError.data.http_status).toBe(500);
      expect(builtError.data.genre).toBe(ErrorCategory.Technical);
      expect(builtError.message).toBe(UnknownErrorCode.UnknownError);
    });

    it('should return unknown error when error is unknown but custom error is specified', () => {
      const error = new Error('Hello');

      const builtError = mapToGraphQLError(
        error,
        UnknownErrorCode.CanUnregisterPlatformUnknownError
      );

      const isApolloErrorInstance = isInstance(builtError);
      expect(isApolloErrorInstance).toBeTruthy();

      expect(builtError.data.http_status).toBe(500);
      expect(builtError.data.genre).toBe(ErrorCategory.Technical);
      expect(builtError.message).toBe(
        UnknownErrorCode.CanUnregisterPlatformUnknownError
      );
    });
  });
});
