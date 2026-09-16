import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenErrorCode } from './error.code';
import { sendAppError } from './error.rest-mapping';
import { ForbiddenAccess } from './error.util';

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

    it('should fall back to a generic 500 for an unrecognized error', () => {
      const { res, status, json } = buildResponse();

      sendAppError(res, new Error('boom'));

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        code: 500,
        message: 'Internal server error',
      });
    });
  });
});
