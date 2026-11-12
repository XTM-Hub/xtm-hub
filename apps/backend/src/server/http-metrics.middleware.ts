import type { Request } from 'express';
import promBundle from 'express-prom-bundle';
import { register, Registry } from 'prom-client';

export const UNMATCHED_PATH_LABEL = 'unmatched';
export const OTHER_METHOD_LABEL = 'other';
// Node accepts about 34 methods (PROPFIND, MKCOL, PURGE...): only these get their own label
const LABELLED_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]);

interface HttpMetricsMiddlewareOptions {
  // Paths mounted with app.use: their requests match no route, so they are labelled by mount path
  mountPaths: string[];
  promRegistry?: Registry;
}

// The label is the registered route pattern, never the URL: a client must not be able to create label values, each
// one being a time series kept in memory until restart.
export const createMetricsPathNormalizer = (mountPaths: string[]) => {
  // Express matches paths case-insensitively, so req.baseUrl keeps the client's casing: it is only compared, never
  // used as the label.
  const mountPathByLowerCase = new Map(
    mountPaths.map((mountPath) => [mountPath.toLowerCase(), mountPath])
  );
  // baseUrl is undefined once a request has gone through every handler without a response (404)
  const resolveMountPath = (baseUrl: string | undefined) =>
    baseUrl ? mountPathByLowerCase.get(baseUrl.toLowerCase()) : '';

  return (req: Request): string => {
    const mountPath = resolveMountPath(req.baseUrl as string | undefined);
    const routePath: unknown = req.route?.path;
    if (routePath !== undefined) {
      return `${mountPath ?? ''}${String(routePath)}`;
    }
    return mountPath || UNMATCHED_PATH_LABEL;
  };
};

export const createHttpMetricsMiddleware = ({
  mountPaths,
  promRegistry = register,
}: HttpMetricsMiddlewareOptions) =>
  promBundle({
    includeMethod: true,
    includePath: true,
    normalizePath: createMetricsPathNormalizer(mountPaths),
    transformLabels: (labels, req) => {
      labels.method = LABELLED_METHODS.has(req.method)
        ? req.method
        : OTHER_METHOD_LABEL;
    },
    customLabels: {
      app: 'xtm-hub-api',
    },
    promRegistry,
  });
