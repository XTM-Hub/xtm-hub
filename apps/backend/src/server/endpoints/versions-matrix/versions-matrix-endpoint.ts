import cors from 'cors';
import { Express, Request, Response } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { PlatformIdentifier } from '../../../__generated__/resolvers-types';
import { DocumentDomain } from '../../../modules/document/domain/document.domain';
import { ManageProductVersionDomain } from '../../../modules/manage-product-version/manage-product-version.domain';
import { ManifestFragmentHelper } from '../../../modules/shareable-resource/manifest-fragment/manifest-fragment.helper';
import { logApp } from '../../../utils/app-logger.util';
import { buildIpRateLimiterOptions } from '../shared/ip-rate-limit.util';
import { isProduct } from '../shared/product.util';
import {
  sendVersionsMatrixError,
  sendVersionsMatrixValidationError,
  VERSIONS_MATRIX_ERRORS,
  type VersionsMatrixError,
} from './versions-matrix-endpoint.errors';
import {
  buildMatrixEntries,
  buildVersionsMatrixCsv,
  buildVersionsMatrixEnv,
  buildVersionsMatrixETag,
  buildVersionsMatrixJson,
  findIncompatibleSlugs,
  findUnknownSlugs,
  groupConnectorVersionsBySlug,
  parseConnectorSlugs,
  parseVersionsMatrixFormat,
  type VersionsMatrixEntry,
  type VersionsMatrixFormat,
} from './versions-matrix-endpoint.utils';

const VERSIONS_MATRIX_RATE_WINDOW_MS = 60 * 1000;
const VERSIONS_MATRIX_RATE_MAX = 300;

export const buildVersionsMatrixRateLimiterOptions = (): Partial<Options> =>
  buildIpRateLimiterOptions({
    windowMs: VERSIONS_MATRIX_RATE_WINDOW_MS,
    limit: VERSIONS_MATRIX_RATE_MAX,
    logLabel: 'Versions matrix',
    sendRateLimitError: (res) =>
      sendVersionsMatrixError(res, VERSIONS_MATRIX_ERRORS.TooManyRequests),
  });

const versionsMatrixRateLimiter = rateLimit(
  buildVersionsMatrixRateLimiterOptions()
);

type Result<T> =
  { ok: true; value: T } | { ok: false; error: VersionsMatrixError };

/**
 * Connector compatibility data only exists for OpenCTI today, so any other
 * (valid) product identifier is accepted by the `:product` route param but
 * rejected here rather than silently returning an empty/misleading matrix.
 */
const validateRequestedProduct = (
  rawProduct: unknown
): Result<PlatformIdentifier> => {
  if (!isProduct(rawProduct)) {
    return { ok: false, error: VERSIONS_MATRIX_ERRORS.InvalidProduct };
  }
  if (rawProduct !== PlatformIdentifier.Opencti) {
    return { ok: false, error: VERSIONS_MATRIX_ERRORS.UnsupportedProduct };
  }
  return { ok: true, value: rawProduct };
};

const validateRequestedFormat = (
  rawFormat: unknown
): Result<VersionsMatrixFormat> => {
  const format = parseVersionsMatrixFormat(rawFormat);
  return format
    ? { ok: true, value: format }
    : { ok: false, error: VERSIONS_MATRIX_ERRORS.InvalidFormat };
};

type VersionResolutionResult =
  | { ok: true; value: string }
  | { ok: false; error: VersionsMatrixError }
  | { ok: false; message: string; status: 404 };

/**
 * Resolves and validates the requested product version: parses the
 * `version` query parameter when provided, otherwise falls back to the
 * latest version registered for that product. Fails when the version is
 * missing/malformed/not a registered version for the product, or when
 * defaulting finds nothing registered at all.
 */
const resolveRequestedVersion = async (
  product: PlatformIdentifier,
  rawVersion: unknown
): Promise<VersionResolutionResult> => {
  const registeredVersions =
    await ManageProductVersionDomain.loadRegisteredProductVersions(product);

  if (rawVersion === undefined) {
    const version = registeredVersions[0]?.version;
    return version
      ? { ok: true, value: version }
      : { ok: false, error: VERSIONS_MATRIX_ERRORS.NoRegisteredVersion };
  }

  if (typeof rawVersion !== 'string') {
    return { ok: false, error: VERSIONS_MATRIX_ERRORS.InvalidVersionFormat };
  }
  let paddedVersion: string;
  try {
    paddedVersion =
      ManifestFragmentHelper.validateAndFormatManifestVersion(rawVersion);
  } catch {
    return { ok: false, error: VERSIONS_MATRIX_ERRORS.InvalidVersionFormat };
  }

  // A well-formed but never-registered version (e.g. a made-up or
  // not-yet-reported one) isn't a "compatibility" question, it's simply
  // unknown for this product: reject it up front (404, like
  // NoRegisteredVersion above) rather than letting it silently pass through
  // to the (unrelated) slug compatibility checks.
  //
  // The comparison uses the padded form, like every other version
  // comparison in the matrix, so that formatting differences between the
  // request and the registered value (missing zero-padding, LTS suffix
  // casing, ...) can't cause a false "unregistered" result.
  const isRegistered = registeredVersions.some(
    (registered) => registered.version_padded === paddedVersion
  );
  if (!isRegistered) {
    return {
      ok: false,
      message: `Unknown ${product} version: ${rawVersion}`,
      status: 404,
    };
  }

  return { ok: true, value: rawVersion };
};

type MatrixEntriesResult =
  | { ok: true; entries: VersionsMatrixEntry[] }
  | { ok: false; message: string; status: 404 | 409 };

/**
 * Resolves the matrix entries for the requested (or, by default, all known)
 * connector slugs, rejecting slugs that are unknown or incompatible with the
 * resolved OpenCTI version.
 */
const resolveMatrixEntries = async (
  version: string,
  requestedSlugs: string[] | undefined
): Promise<MatrixEntriesResult> => {
  const knownSlugs = await DocumentDomain.loadDistinctConnectorSlugs(version);

  const unknownSlugs = findUnknownSlugs(requestedSlugs, knownSlugs);
  if (unknownSlugs.length > 0) {
    return {
      ok: false,
      message: `Unknown connector slug(s): ${unknownSlugs.join(', ')}`,
      status: 404,
    };
  }

  const targetSlugs = requestedSlugs ?? [...knownSlugs].sort();
  const compatibleConnectors =
    await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
      targetSlugs,
      version
    );
  const versionBySlug = groupConnectorVersionsBySlug(compatibleConnectors);

  const incompatibleSlugs = findIncompatibleSlugs(
    requestedSlugs,
    versionBySlug
  );
  if (incompatibleSlugs.length > 0) {
    return {
      ok: false,
      message: `Incompatible connector slug(s) for OpenCTI version ${version}: ${incompatibleSlugs.join(', ')}`,
      // 409: the slugs themselves are known (unlike unknownSlugs above),
      // they just conflict with the resolved version.
      status: 409,
    };
  }

  return { ok: true, entries: buildMatrixEntries(targetSlugs, versionBySlug) };
};

const sendVersionsMatrixBody = (
  req: Request,
  res: Response,
  format: VersionsMatrixFormat,
  version: string,
  entries: VersionsMatrixEntry[]
): void => {
  if (format === 'env') {
    const body = buildVersionsMatrixEnv(version, entries);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('ETag', buildVersionsMatrixETag(body));
    res.setHeader('Cache-Control', 'no-cache');
    if (req.fresh) {
      res.status(304).end();
      return;
    }
    res.status(200).send(body);
    return;
  }

  if (format === 'csv') {
    const body = buildVersionsMatrixCsv(version, entries);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('ETag', buildVersionsMatrixETag(body));
    res.setHeader('Cache-Control', 'no-cache');
    if (req.fresh) {
      res.status(304).end();
      return;
    }
    res.status(200).send(body);
    return;
  }

  const body = buildVersionsMatrixJson(version, entries);
  res.setHeader('ETag', buildVersionsMatrixETag(JSON.stringify(body)));
  res.setHeader('Cache-Control', 'no-cache');
  if (req.fresh) {
    res.status(304).end();
    return;
  }
  res.status(200).json(body);
};

export const VersionsMatrixEndpoint = {
  getMatrix: async (req: Request, res: Response): Promise<void> => {
    try {
      const productResult = validateRequestedProduct(req.params.product);
      if (!productResult.ok) {
        sendVersionsMatrixError(res, productResult.error);
        return;
      }

      const formatResult = validateRequestedFormat(req.query.format);
      if (!formatResult.ok) {
        sendVersionsMatrixError(res, formatResult.error);
        return;
      }

      const slugsResult = parseConnectorSlugs(req.query.connector_slugs);
      if (!slugsResult.ok) {
        sendVersionsMatrixError(
          res,
          VERSIONS_MATRIX_ERRORS.InvalidConnectorSlugs
        );
        return;
      }

      const versionResult = await resolveRequestedVersion(
        productResult.value,
        req.query.version
      );
      if (!versionResult.ok) {
        if ('message' in versionResult) {
          sendVersionsMatrixValidationError(
            res,
            versionResult.message,
            versionResult.status
          );
        } else {
          sendVersionsMatrixError(res, versionResult.error);
        }
        return;
      }

      const matrixResult = await resolveMatrixEntries(
        versionResult.value,
        slugsResult.slugs
      );
      if (!matrixResult.ok) {
        sendVersionsMatrixValidationError(
          res,
          matrixResult.message,
          matrixResult.status
        );
        return;
      }

      sendVersionsMatrixBody(
        req,
        res,
        formatResult.value,
        versionResult.value,
        matrixResult.entries
      );
    } catch (error) {
      logApp.error('Error while building the versions matrix', { error });
      sendVersionsMatrixError(res, VERSIONS_MATRIX_ERRORS.InternalServerError);
    }
  },
};

export const versionsMatrixEndpoint = (app: Express) => {
  app.get(
    '/:product/versions-matrix',
    versionsMatrixRateLimiter,
    cors(),
    VersionsMatrixEndpoint.getMatrix
  );
};
