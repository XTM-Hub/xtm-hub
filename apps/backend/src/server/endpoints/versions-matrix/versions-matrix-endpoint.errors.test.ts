import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  VERSIONS_MATRIX_ERRORS,
  sendVersionsMatrixError,
  sendVersionsMatrixValidationError,
} from './versions-matrix-endpoint.errors';

const buildResponse = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
};

describe('sendVersionsMatrixError', () => {
  it.each([
    { error: VERSIONS_MATRIX_ERRORS.InvalidProduct, status: 400 },
    { error: VERSIONS_MATRIX_ERRORS.UnsupportedProduct, status: 404 },
    { error: VERSIONS_MATRIX_ERRORS.InvalidFormat, status: 400 },
    {
      error: VERSIONS_MATRIX_ERRORS.NoRegisteredVersion,
      status: 404,
    },
    { error: VERSIONS_MATRIX_ERRORS.TooManyRequests, status: 429 },
    { error: VERSIONS_MATRIX_ERRORS.InternalServerError, status: 500 },
  ])('derives $status from the error', ({ error, status }) => {
    const { res, status: statusMock, json } = buildResponse();

    sendVersionsMatrixError(res, error);

    expect(statusMock).toHaveBeenCalledWith(status);
    expect(json).toHaveBeenCalledWith({ code: status, message: error.message });
  });
});

describe('sendVersionsMatrixValidationError', () => {
  it('answers 404 with the provided message when the requested resource is unknown', () => {
    const { res, status, json } = buildResponse();

    sendVersionsMatrixValidationError(
      res,
      'Unknown connector slug(s): foo',
      404
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      code: 404,
      message: 'Unknown connector slug(s): foo',
    });
  });

  it('answers 409 with the provided message when the requested resource conflicts', () => {
    const { res, status, json } = buildResponse();

    sendVersionsMatrixValidationError(
      res,
      'Incompatible connector slug(s) for OpenCTI version 7.260904.0: foo',
      409
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      code: 409,
      message:
        'Incompatible connector slug(s) for OpenCTI version 7.260904.0: foo',
    });
  });
});
