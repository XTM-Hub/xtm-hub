import cors from 'cors';
import { Express, Request, Response } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { ManageProductVersionDomain } from '../../../modules/manage-product-version/manage-product-version.domain';
import { logApp } from '../../../utils/app-logger.util';
import { buildIpRateLimiterOptions } from '../shared/ip-rate-limit.util';
import { isProduct } from '../shared/product.util';

const PRODUCT_VERSION_RATE_WINDOW_MS = 60 * 1000;
const PRODUCT_VERSION_RATE_MAX = 300;

export const buildProductVersionRateLimiterOptions = (): Partial<Options> =>
  buildIpRateLimiterOptions({
    windowMs: PRODUCT_VERSION_RATE_WINDOW_MS,
    limit: PRODUCT_VERSION_RATE_MAX,
    logLabel: 'Product version',
    sendRateLimitError: (res) =>
      res.status(429).json({
        code: 429,
        message: 'Too many requests, please try again later',
      }),
  });

const productVersionRateLimiter = rateLimit(
  buildProductVersionRateLimiterOptions()
);

export const ProductVersionEndpoint = {
  listRegisteredVersions: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { product } = req.params;
      if (!isProduct(product)) {
        res.status(400).json({ code: 400, message: 'Invalid product' });
        return;
      }

      const registeredVersions =
        await ManageProductVersionDomain.loadRegisteredProductVersions(product);

      res.status(200).json({
        product,
        versions: registeredVersions.map(({ version, created_at }) => ({
          version,
          created_at,
        })),
      });
    } catch (error) {
      logApp.error('Error while listing registered product versions', {
        error,
      });
      res.status(500).json({ code: 500, message: 'Internal server error' });
    }
  },
};

export const productVersionEndpoint = (app: Express) => {
  app.get(
    '/:product/versions',
    productVersionRateLimiter,
    cors(),
    ProductVersionEndpoint.listRegisteredVersions
  );
};
