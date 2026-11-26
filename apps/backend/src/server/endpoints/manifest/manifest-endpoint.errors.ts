import type { Response } from 'express';

type ManifestErrorStatus = 400 | 404 | 429 | 500 | 503;

interface ManifestErrorDefinition {
  readonly message: string;
  readonly status: ManifestErrorStatus;
}

export const MANIFEST_ERRORS = {
  InvalidCount: { message: 'Invalid count', status: 400 },
  InvalidManifestName: { message: 'Invalid manifest name', status: 400 },
  ManifestNotFound: { message: 'Manifest not found', status: 404 },
  TooManyRequests: {
    message: 'Too many requests, please try again later',
    status: 429,
  },
  StorageUnavailable: {
    message: 'Manifest storage is temporarily unavailable',
    status: 503,
  },
  InternalServerError: { message: 'Internal server error', status: 500 },
} as const satisfies Record<string, ManifestErrorDefinition>;

type ManifestError = (typeof MANIFEST_ERRORS)[keyof typeof MANIFEST_ERRORS];

const sendError = (
  res: Response,
  status: ManifestErrorStatus,
  message: string
): void => {
  res.removeHeader('Cache-Control');
  res.removeHeader('ETag');
  res.status(status).json({ code: status, message });
};

export const sendManifestError = (res: Response, error: ManifestError): void =>
  sendError(res, error.status, error.message);

/**
 * Validation messages are built by validateManifestParams and are not part of
 * the catalogue above, so they carry no status of their own — always 400.
 */
export const sendManifestValidationError = (
  res: Response,
  message: string
): void => sendError(res, 400, message);
