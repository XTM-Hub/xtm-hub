import type { Response } from 'express';

type VersionsMatrixErrorStatus = 400 | 404 | 429 | 500;

interface VersionsMatrixErrorDefinition {
  readonly message: string;
  readonly status: VersionsMatrixErrorStatus;
}

export const VERSIONS_MATRIX_ERRORS = {
  InvalidProduct: { message: 'Invalid product', status: 400 },
  /**
   * Connector compatibility data is only tracked for OpenCTI today, so any
   * other (valid) product identifier is rejected here rather than silently
   * returning an empty/misleading matrix.
   */
  UnsupportedProduct: {
    message: 'The versions matrix is only available for the opencti product',
    status: 400,
  },
  InvalidVersionFormat: { message: 'Invalid version format', status: 400 },
  InvalidFormat: {
    message: 'Invalid format, expected "json", "env" or "csv"',
    status: 400,
  },
  InvalidConnectorSlugs: {
    message: 'Invalid connector_slugs parameter',
    status: 400,
  },
  NoRegisteredVersion: {
    message: 'No registered version found for this product',
    status: 404,
  },
  TooManyRequests: {
    message: 'Too many requests, please try again later',
    status: 429,
  },
  InternalServerError: { message: 'Internal server error', status: 500 },
} as const satisfies Record<string, VersionsMatrixErrorDefinition>;

export type VersionsMatrixError =
  (typeof VERSIONS_MATRIX_ERRORS)[keyof typeof VERSIONS_MATRIX_ERRORS];

export const sendVersionsMatrixError = (
  res: Response,
  error: VersionsMatrixError
): void => {
  res.status(error.status).json({ code: error.status, message: error.message });
};

/**
 * Unknown/incompatible connector slug messages are built dynamically from the
 * request (they list the offending slugs), so they are not part of the
 * static catalogue above; they always carry a 400 status.
 */
export const sendVersionsMatrixValidationError = (
  res: Response,
  message: string
): void => {
  res.status(400).json({ code: 400, message });
};
