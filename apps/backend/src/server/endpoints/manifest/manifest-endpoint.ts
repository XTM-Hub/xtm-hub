import cors from 'cors';
import { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Readable } from 'stream';
import { PlatformIdentifier } from '../../../__generated__/resolvers-types';
import { ManifestDomain } from '../../../modules/shareable-resource/manifest/manifest.domain';
import { ManifestHelper } from '../../../modules/shareable-resource/manifest/manifest.helper';
import { MinIOClient } from '../../../thirdparty/minio/client';
import { StorageUnavailableError } from '../../../thirdparty/minio/storage-error';
import { logApp } from '../../../utils/app-logger.util';
import { getErrorMessage } from '../../../utils/error/error-guard.util';
import {
  MANIFEST_ERRORS,
  sendManifestError,
  sendManifestValidationError,
} from './manifest-endpoint.errors';
import { buildManifestRateLimiterOptions } from './manifest-endpoint.rate-limit';
import {
  buildManifestETag,
  isValidManifestName,
  parseCount,
  validateManifestParams,
} from './manifest-endpoint.utils';

const manifestRateLimiter = rateLimit(buildManifestRateLimiterOptions());

export const ManifestEndpoint = {
  listManifests: async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = validateManifestParams(req.params);
      if (!validation.ok) {
        sendManifestValidationError(res, validation.message);
        return;
      }
      const { product, version, integrationType } = validation;

      const count = parseCount(req.query.count);
      if (count === undefined) {
        sendManifestError(res, MANIFEST_ERRORS.InvalidCount);
        return;
      }

      const manifests = await ManifestDomain.loadManifests(
        product,
        version,
        integrationType,
        count
      );
      res.status(200).json({
        manifests: manifests.map(({ created_at, name }) => ({
          created_at,
          name,
        })),
      });
    } catch (error) {
      logApp.error('Error while listing manifests', { error });
      sendManifestError(res, MANIFEST_ERRORS.InternalServerError);
    }
  },

  downloadLatestManifest: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const validation = validateManifestParams(req.params);
      if (!validation.ok) {
        sendManifestValidationError(res, validation.message);
        return;
      }
      const { product, version, integrationType } = validation;

      const [latest] = await ManifestDomain.loadManifests(
        product,
        version,
        integrationType,
        1
      );
      if (!latest) {
        logApp.info('No manifest found', {
          product,
          version,
          type: integrationType,
        });
        sendManifestError(res, MANIFEST_ERRORS.ManifestNotFound);
        return;
      }

      if (!isValidManifestName(latest.name)) {
        logApp.error('Manifest name failed validation before MinIO lookup', {
          name: latest.name,
        });
        sendManifestError(res, MANIFEST_ERRORS.ManifestNotFound);
        return;
      }

      res.setHeader('ETag', buildManifestETag(latest.name));
      res.setHeader('Cache-Control', 'no-cache');
      if (req.fresh) {
        res.status(304).end();
        return;
      }

      await streamManifestByName(res, product, version, latest.name);
    } catch (error) {
      if (res.headersSent) {
        logApp.error('Latest manifest request failed after headers were sent', {
          error,
        });
        res.destroy(error as Error);
        return;
      }
      if (error instanceof StorageUnavailableError) {
        logApp.error('Manifest storage unavailable', {
          error: getErrorMessage(error),
        });
        sendManifestError(res, MANIFEST_ERRORS.StorageUnavailable);
        return;
      }
      logApp.error('Error while retrieving latest manifest', { error });
      sendManifestError(res, MANIFEST_ERRORS.InternalServerError);
    }
  },

  downloadManifestByName: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const validation = validateManifestParams(req.params);
      if (!validation.ok) {
        sendManifestValidationError(res, validation.message);
        return;
      }
      const { product, version, integrationType } = validation;

      const { name } = req.params;
      if (typeof name !== 'string' || !isValidManifestName(name)) {
        sendManifestError(res, MANIFEST_ERRORS.InvalidManifestName);
        return;
      }

      const manifest = await ManifestDomain.getManifestByName(
        product,
        version,
        integrationType,
        name
      );
      if (!manifest) {
        logApp.info('No manifest found for the requested name', {
          product,
          version,
          type: integrationType,
          name,
        });
        sendManifestError(res, MANIFEST_ERRORS.ManifestNotFound);
        return;
      }

      res.setHeader('ETag', buildManifestETag(manifest.name));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (req.fresh) {
        res.status(304).end();
        return;
      }

      await streamManifestByName(res, product, version, manifest.name);
    } catch (error) {
      if (res.headersSent) {
        logApp.error('Manifest request failed after headers were sent', {
          error,
        });
        res.destroy(error as Error);
        return;
      }
      if (error instanceof StorageUnavailableError) {
        logApp.error('Manifest storage unavailable', {
          error: getErrorMessage(error),
        });
        sendManifestError(res, MANIFEST_ERRORS.StorageUnavailable);
        return;
      }
      logApp.error('Error while retrieving manifest by name', { error });
      sendManifestError(res, MANIFEST_ERRORS.InternalServerError);
    }
  },
};

export const manifestEndpoint = (app: Express) => {
  app.get(
    '/:product/:version/:integrationType/manifests',
    manifestRateLimiter,
    cors(),
    ManifestEndpoint.listManifests
  );
  app.get(
    '/:product/:version/:integrationType/manifests/latest',
    manifestRateLimiter,
    cors(),
    ManifestEndpoint.downloadLatestManifest
  );
  app.get(
    '/:product/:version/:integrationType/manifests/:name',
    manifestRateLimiter,
    cors(),
    ManifestEndpoint.downloadManifestByName
  );
};

const streamManifestByName = async (
  res: Response,
  product: PlatformIdentifier,
  version: string,
  name: string
): Promise<void> => {
  const key = ManifestHelper.buildManifestObjectKey(product, version, name);
  const body = await MinIOClient.downloadFile(key);
  if (!body) {
    logApp.error('Manifest row exists but object is missing in storage', {
      key,
    });
    sendManifestError(res, MANIFEST_ERRORS.ManifestNotFound);
    return;
  }

  const stream = body as Readable;

  res.setHeader('Content-Type', 'application/json');

  stream.on('error', (error) => {
    logApp.error('Error while streaming manifest', { error });
    if (res.headersSent) {
      res.destroy(error);
    } else {
      sendManifestError(res, MANIFEST_ERRORS.StorageUnavailable);
    }
  });

  stream.pipe(res);
};
