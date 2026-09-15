import { Express } from 'express';
import { documentDownloadEndpoint } from './document/document-download-endpoint';
import { documentVisualizeEndpoint } from './document/document-visualize-endpoint';
import { healthEndpoint } from './health/health-endpoint';
import { manifestEndpoint } from './manifest/manifest-endpoint';
import { productVersionEndpoint } from './product-version/product-version-endpoint';
import { userPictureEndpoint } from './user-picture/user-picture-endpoint';
import { versionsMatrixEndpoint } from './versions-matrix/versions-matrix-endpoint';

// Single wiring point for every REST endpoint — add new ones here.
export const registerEndpoints = (app: Express) => {
  healthEndpoint(app);
  userPictureEndpoint(app);
  manifestEndpoint(app);
  productVersionEndpoint(app);
  versionsMatrixEndpoint(app);
  // Implemented as routes, not GraphQL resolvers: a resolver can't attach a file to the response.
  documentDownloadEndpoint(app);
  documentVisualizeEndpoint(app);
};
