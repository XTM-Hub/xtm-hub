import type { Options } from 'express-rate-limit';
import {
  MANIFEST_RATE_MAX,
  MANIFEST_RATE_WINDOW_MS,
} from '../../../modules/shareable-resource/manifest/manifest.consts';
import { buildIpRateLimiterOptions } from '../shared/ip-rate-limit.util';
import { MANIFEST_ERRORS, sendManifestError } from './manifest-endpoint.errors';

export const buildManifestRateLimiterOptions = (): Partial<Options> =>
  buildIpRateLimiterOptions({
    windowMs: MANIFEST_RATE_WINDOW_MS,
    limit: MANIFEST_RATE_MAX,
    logLabel: 'Manifest',
    sendRateLimitError: (res) =>
      sendManifestError(res, MANIFEST_ERRORS.TooManyRequests),
  });
