import cors from 'cors';
import { Express, Request, Response } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { PlatformIdentifier } from '../../../__generated__/resolvers-types';
import { DocumentDomain } from '../../../modules/document/domain/document.domain';
import { ManifestFragmentHelper } from '../../../modules/shareable-resource/manifest-fragment/manifest-fragment.helper';
import { logApp } from '../../../utils/app-logger.util';
import { isLtsVersion } from '../../../utils/versioning';
import { buildETag } from '../shared/etag.util';
import { buildIpRateLimiterOptions } from '../shared/ip-rate-limit.util';
import { resolveRegisteredProductVersion } from '../shared/product-version.util';
import { resolveOpenctiOnlyProduct } from '../shared/product.util';
import {
  INTEGRATIONS_COMPATIBILITY_ERRORS,
  sendIntegrationsCompatibilityError,
  sendIntegrationsCompatibilityValidationError,
  type IntegrationsCompatibilityError,
} from './integrations-compatibility-endpoint.errors';
import {
  buildIntegrationsCompatibilityBody,
  classifyIntegrationCompatibility,
  parseIntegrationVersions,
  type CompatibilityCandidate,
  type IntegrationCompatibilityEntry,
  type IntegrationVersionPair,
} from './integrations-compatibility-endpoint.utils';

const INTEGRATIONS_COMPATIBILITY_RATE_WINDOW_MS = 60 * 1000;
const INTEGRATIONS_COMPATIBILITY_RATE_MAX = 300;

export const buildIntegrationsCompatibilityRateLimiterOptions =
  (): Partial<Options> =>
    buildIpRateLimiterOptions({
      windowMs: INTEGRATIONS_COMPATIBILITY_RATE_WINDOW_MS,
      limit: INTEGRATIONS_COMPATIBILITY_RATE_MAX,
      logLabel: 'Integrations compatibility',
      sendRateLimitError: (res) =>
        sendIntegrationsCompatibilityError(
          res,
          INTEGRATIONS_COMPATIBILITY_ERRORS.TooManyRequests
        ),
    });

const integrationsCompatibilityRateLimiter = rateLimit(
  buildIntegrationsCompatibilityRateLimiterOptions()
);

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: IntegrationsCompatibilityError };

const validateRequestedProduct = (
  rawProduct: unknown
): Result<PlatformIdentifier> => {
  const resolution = resolveOpenctiOnlyProduct(rawProduct);
  if (resolution.ok) {
    return { ok: true, value: resolution.product };
  }
  return {
    ok: false,
    error:
      resolution.reason === 'invalid'
        ? INTEGRATIONS_COMPATIBILITY_ERRORS.InvalidProduct
        : INTEGRATIONS_COMPATIBILITY_ERRORS.UnsupportedProduct,
  };
};

const validateRequestedIntegrationVersions = (
  raw: unknown
): Result<IntegrationVersionPair[]> => {
  const parsed = parseIntegrationVersions(raw);
  if (parsed.ok) {
    return { ok: true, value: parsed.pairs };
  }
  return {
    ok: false,
    error:
      parsed.reason === 'missing'
        ? INTEGRATIONS_COMPATIBILITY_ERRORS.MissingIntegrationVersions
        : INTEGRATIONS_COMPATIBILITY_ERRORS.InvalidIntegrationVersions,
  };
};

type VersionResolutionResult =
  | { ok: true; value: string }
  | { ok: false; error: IntegrationsCompatibilityError }
  | { ok: false; message: string; status: 404 };

const resolveRequestedVersion = async (
  product: PlatformIdentifier,
  rawVersion: unknown
): Promise<VersionResolutionResult> => {
  const resolution = await resolveRegisteredProductVersion(product, rawVersion);

  if (resolution.ok) {
    return { ok: true, value: resolution.version };
  }

  switch (resolution.reason) {
    case 'no-registered-version':
      return {
        ok: false,
        error: INTEGRATIONS_COMPATIBILITY_ERRORS.NoRegisteredVersion,
      };
    case 'invalid-format':
      return {
        ok: false,
        error: INTEGRATIONS_COMPATIBILITY_ERRORS.InvalidVersionFormat,
      };
    case 'unregistered':
      return {
        ok: false,
        message: `Unknown ${product} version: ${String(rawVersion)}`,
        status: 404,
      };
  }
};

const buildCandidateKey = (slug: string, versionPadded: string): string =>
  `${slug}@${versionPadded}`;

/**
 * Resolves every requested pair in three queries rather than per entry: the
 * integration type of each slug, the exact (slug, version) matches, and the
 * newest compatible version per slug.
 */
const resolveCompatibilityEntries = async (
  pairs: IntegrationVersionPair[],
  productVersion: string
): Promise<IntegrationCompatibilityEntry[]> => {
  const slugs = Array.from(new Set(pairs.map((pair) => pair.slug)));

  const [integrationTypes, candidates, bestCompatible] = await Promise.all([
    DocumentDomain.loadIntegrationTypesBySlugs(slugs),
    DocumentDomain.loadConnectorsBySlugAndPaddedVersions(
      pairs.map((pair) => ({
        slug: pair.slug,
        versionPadded: pair.versionPadded,
      }))
    ),
    DocumentDomain.loadBestCompatibleConnectorsBySlugs(slugs, productVersion),
  ]);

  const candidateByKey = new Map<string, CompatibilityCandidate>();
  for (const candidate of candidates) {
    if (candidate.slug === null) continue;
    candidateByKey.set(
      buildCandidateKey(candidate.slug, candidate.version_padded),
      {
        version_padded: candidate.version_padded,
        active: candidate.active,
        is_decommissioned: candidate.is_decommissioned,
        minimum_deployable_version: candidate.minimum_deployable_version,
        minimum_deployable_version_padded:
          candidate.minimum_deployable_version_padded,
      }
    );
  }

  const latestCompatibleBySlug = new Map<string, string>();
  for (const connector of bestCompatible) {
    if (connector.slug !== null && connector.version !== null) {
      latestCompatibleBySlug.set(connector.slug, connector.version);
    }
  }

  const productVersionPadded =
    ManifestFragmentHelper.validateAndFormatManifestVersion(productVersion);
  const productIsLts = isLtsVersion(productVersion);

  return pairs.map((pair) =>
    classifyIntegrationCompatibility({
      pair,
      productVersionPadded,
      productIsLts,
      integrationType: integrationTypes.get(pair.slug),
      candidate: candidateByKey.get(
        buildCandidateKey(pair.slug, pair.versionPadded)
      ),
      latestCompatibleVersion: latestCompatibleBySlug.get(pair.slug),
    })
  );
};

export const IntegrationsCompatibilityEndpoint = {
  getCompatibility: async (req: Request, res: Response): Promise<void> => {
    try {
      const productResult = validateRequestedProduct(req.params.product);
      if (!productResult.ok) {
        sendIntegrationsCompatibilityError(res, productResult.error);
        return;
      }

      const pairsResult = validateRequestedIntegrationVersions(
        req.query.integration_versions
      );
      if (!pairsResult.ok) {
        sendIntegrationsCompatibilityError(res, pairsResult.error);
        return;
      }

      const versionResult = await resolveRequestedVersion(
        productResult.value,
        req.query.version
      );
      if (!versionResult.ok) {
        if ('message' in versionResult) {
          sendIntegrationsCompatibilityValidationError(
            res,
            versionResult.message,
            versionResult.status
          );
        } else {
          sendIntegrationsCompatibilityError(res, versionResult.error);
        }
        return;
      }

      const entries = await resolveCompatibilityEntries(
        pairsResult.value,
        versionResult.value
      );
      const body = buildIntegrationsCompatibilityBody(
        versionResult.value,
        entries
      );

      res.setHeader('ETag', buildETag(JSON.stringify(body)));
      res.setHeader('Cache-Control', 'no-cache');
      if (req.fresh) {
        res.status(304).end();
        return;
      }
      res.status(200).json(body);
    } catch (error) {
      logApp.error('Error while checking integrations compatibility', {
        error,
      });
      sendIntegrationsCompatibilityError(
        res,
        INTEGRATIONS_COMPATIBILITY_ERRORS.InternalServerError
      );
    }
  },
};

export const integrationsCompatibilityEndpoint = (app: Express) => {
  app.get(
    '/:product/integrations-compatibility',
    integrationsCompatibilityRateLimiter,
    cors(),
    IntegrationsCompatibilityEndpoint.getCompatibility
  );
};
