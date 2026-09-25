import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  INTEGRATIONS_COMPATIBILITY_ERRORS,
  sendIntegrationsCompatibilityError,
  sendIntegrationsCompatibilityValidationError,
} from './integrations-compatibility-endpoint.errors';

const buildResponse = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
};

describe('sendIntegrationsCompatibilityError', () => {
  it.each([
    { error: INTEGRATIONS_COMPATIBILITY_ERRORS.InvalidProduct, status: 400 },
    {
      error: INTEGRATIONS_COMPATIBILITY_ERRORS.UnsupportedProduct,
      status: 404,
    },
    {
      error: INTEGRATIONS_COMPATIBILITY_ERRORS.InvalidVersionFormat,
      status: 400,
    },
    {
      error: INTEGRATIONS_COMPATIBILITY_ERRORS.MissingIntegrationVersions,
      status: 400,
    },
    {
      error: INTEGRATIONS_COMPATIBILITY_ERRORS.InvalidIntegrationVersions,
      status: 400,
    },
    {
      error: INTEGRATIONS_COMPATIBILITY_ERRORS.NoRegisteredVersion,
      status: 404,
    },
    { error: INTEGRATIONS_COMPATIBILITY_ERRORS.TooManyRequests, status: 429 },
    {
      error: INTEGRATIONS_COMPATIBILITY_ERRORS.InternalServerError,
      status: 500,
    },
  ])('derives $status from the error', ({ error, status }) => {
    const { res, status: statusMock, json } = buildResponse();

    sendIntegrationsCompatibilityError(res, error);

    expect(statusMock).toHaveBeenCalledWith(status);
    expect(json).toHaveBeenCalledWith({ code: status, message: error.message });
  });
});

describe('sendIntegrationsCompatibilityValidationError', () => {
  it('answers 404 with the provided message when the requested version is unknown', () => {
    const { res, status, json } = buildResponse();

    sendIntegrationsCompatibilityValidationError(
      res,
      'Unknown opencti version: 9.999999.9',
      404
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      code: 404,
      message: 'Unknown opencti version: 9.999999.9',
    });
  });
});
