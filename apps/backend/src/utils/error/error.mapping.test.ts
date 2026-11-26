import { isInstance } from 'apollo-errors';
import { describe, expect, it } from 'vitest';
import {
  ErrorCode,
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
  UnknownErrorCode,
} from './error.code';
import { mapToGraphQLError } from './error.mapping';
import { ErrorCategory, ErrorType } from './error.type';

describe('error mapping', () => {
  describe('mapToGraphQLError', () => {
    it.each([
      {
        code: UnauthenticatedErrorCode.Unauthenticated,
        extensionsCode: ErrorType.Unauthenticated,
        httpStatus: 401,
      },
      {
        code: ForbiddenErrorCode.ForbiddenAccess,
        extensionsCode: ErrorType.ForbiddenAccess,
        httpStatus: 403,
      },
      {
        code: ForbiddenErrorCode.MissingCapabilityOnOrganization,
        extensionsCode: ErrorType.ForbiddenAccess,
        httpStatus: 403,
      },
    ])(
      'should keep $code as message and answer $extensionsCode when the code is $code',
      ({ code, extensionsCode, httpStatus }) => {
        // When
        const builtError = mapToGraphQLError(code);

        // Then
        expect(isInstance(builtError)).toBeTruthy();
        expect(builtError.message).toBe(code);
        expect(builtError.extensions).toEqual({ code: extensionsCode });
        expect(builtError.data.http_status).toBe(httpStatus);
      }
    );

    it('should return mapped error when error is known', () => {
      const error = new Error(ErrorCode.InvalidPlatformConfiguration);

      const builtError = mapToGraphQLError(error);

      const isApolloErrorInstance = isInstance(builtError);
      expect(isApolloErrorInstance).toBeTruthy();

      expect(builtError.data.http_status).toBe(400);
      expect(builtError.data.genre).toBe(ErrorCategory.BadRequest);
      expect(builtError.message).toBe(ErrorCode.InvalidPlatformConfiguration);
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
