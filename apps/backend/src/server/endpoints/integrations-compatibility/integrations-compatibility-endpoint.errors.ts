import type { Response } from 'express';

type IntegrationsCompatibilityErrorStatus = 400 | 404 | 429 | 500;

interface IntegrationsCompatibilityErrorDefinition {
  readonly message: string;
  readonly status: IntegrationsCompatibilityErrorStatus;
}

/**
 * Only malformed input and missing resources are errors here. Whether a given
 * integration version is compatible is an *answer*, not an error: it is
 * reported per entry in a 200 response (see the endpoint's reason codes), so
 * that one bad entry never hides the verdict for the other requested ones.
 */
export const INTEGRATIONS_COMPATIBILITY_ERRORS = {
  InvalidProduct: { message: 'Invalid product', status: 400 },
  UnsupportedProduct: {
    message:
      'The integrations compatibility check is only available for the opencti product',
    status: 404,
  },
  InvalidVersionFormat: { message: 'Invalid version format', status: 400 },
  MissingIntegrationVersions: {
    message:
      'Missing integration_versions parameter, expected "slug@version" pairs separated by commas',
    status: 400,
  },
  InvalidIntegrationVersions: {
    message:
      'Invalid integration_versions parameter, expected "slug@version" pairs separated by commas',
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
} as const satisfies Record<string, IntegrationsCompatibilityErrorDefinition>;

export type IntegrationsCompatibilityError =
  (typeof INTEGRATIONS_COMPATIBILITY_ERRORS)[keyof typeof INTEGRATIONS_COMPATIBILITY_ERRORS];

export const sendIntegrationsCompatibilityError = (
  res: Response,
  error: IntegrationsCompatibilityError
): void => {
  res.status(error.status).json({ code: error.status, message: error.message });
};

/**
 * The unknown-version message names the offending version, so it is built
 * from the request rather than taken from the static catalogue above.
 */
export const sendIntegrationsCompatibilityValidationError = (
  res: Response,
  message: string,
  status: Extract<IntegrationsCompatibilityErrorStatus, 404>
): void => {
  res.status(status).json({ code: status, message });
};
