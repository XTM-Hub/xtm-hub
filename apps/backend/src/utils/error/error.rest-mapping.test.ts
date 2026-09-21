import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  AlreadyExistsErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnknownErrorCode,
} from './error.code';
import { sendAppError } from './error.rest-mapping';
import {
  AlreadyExistsError,
  ForbiddenAccess,
  NotFoundError,
} from './error.util';

const buildResponse = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
};

describe('error rest mapping', () => {
  describe('sendAppError', () => {
    it('should map a CustomApolloError to its declared http_status', () => {
      const { res, status, json } = buildResponse();
      const error = ForbiddenAccess(
        ForbiddenErrorCode.MissingCapabilityOnService
      );

      sendAppError(res, error);

      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({
        code: 403,
        message: ForbiddenErrorCode.MissingCapabilityOnService,
      });
    });

    it('should map a plain Error carrying a known ForbiddenErrorCode to 403', () => {
      // Mirrors securityGuard.assertUserIsInOrganization, which throws a
      // plain `Error`, not a CustomApolloError — must still resolve to 403.
      const { res, status, json } = buildResponse();

      sendAppError(res, new Error(ForbiddenErrorCode.UserIsNotInOrganization));

      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({
        code: 403,
        message: ForbiddenErrorCode.UserIsNotInOrganization,
      });
    });

    it('should override the GraphQL-only http_status 200 with 404 for NotFoundError', () => {
      const { res, status, json } = buildResponse();

      sendAppError(res, NotFoundError(NotFoundErrorCode.DocumentNotFound));

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith({
        code: 404,
        message: NotFoundErrorCode.DocumentNotFound,
      });
    });

    it('should override the GraphQL-only http_status 200 with 409 for AlreadyExistsError', () => {
      const { res, status, json } = buildResponse();

      sendAppError(
        res,
        AlreadyExistsError(AlreadyExistsErrorCode.FreeTrialAlreadyExists)
      );

      expect(status).toHaveBeenCalledWith(409);
      expect(json).toHaveBeenCalledWith({
        code: 409,
        message: AlreadyExistsErrorCode.FreeTrialAlreadyExists,
      });
    });

    it('should apply the same 404 override when the error reaches mapToGraphQLError as a plain Error', () => {
      // Not yet a CustomApolloError (e.g. thrown as `new Error(code)` by a
      // Domain function) — must still resolve through mapToGraphQLError and
      // get the same REST override as an already-built NotFoundError.
      const { res, status, json } = buildResponse();

      sendAppError(res, new Error(NotFoundErrorCode.DocumentNotFound));

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith({
        code: 404,
        message: NotFoundErrorCode.DocumentNotFound,
      });
    });

    it('should fall back to a generic 500 for an unrecognized error', () => {
      const { res, status, json } = buildResponse();

      sendAppError(res, new Error('boom'));

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        code: 500,
        message: UnknownErrorCode.UnknownError,
      });
    });
  });
});
