import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  MANIFEST_ERRORS,
  sendManifestError,
  sendManifestValidationError,
} from './manifest-endpoint.errors';

const buildResponse = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const removeHeader = vi.fn();
  return {
    res: { status, removeHeader } as unknown as Response,
    status,
    json,
    removeHeader,
  };
};

describe('sendManifestError', () => {
  it.each([
    { error: MANIFEST_ERRORS.InvalidCount, status: 400 },
    { error: MANIFEST_ERRORS.StorageUnavailable, status: 503 },
  ])('derives $status from the error', ({ error, status }) => {
    const { res, status: statusMock, json } = buildResponse();

    sendManifestError(res, error);

    expect(statusMock).toHaveBeenCalledWith(status);
    expect(json).toHaveBeenCalledWith({ code: status, message: error.message });
  });

  it('clears representation headers before sending an error', () => {
    const { res, removeHeader } = buildResponse();

    sendManifestError(res, MANIFEST_ERRORS.ManifestNotFound);

    expect(removeHeader).toHaveBeenCalledWith('Cache-Control');
    expect(removeHeader).toHaveBeenCalledWith('ETag');
  });
});

describe('sendManifestValidationError', () => {
  it('answers 400 with the message built by the validator', () => {
    const { res, status, json } = buildResponse();

    sendManifestValidationError(res, 'Invalid product');

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      code: 400,
      message: 'Invalid product',
    });
  });
});
