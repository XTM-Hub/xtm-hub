import express from 'express';

import type { DeploymentRequestDataLoaders } from '../modules/deployment/deployment.dataloader';
import type { DocumentDataLoaders } from '../modules/document/document.dataloader';
import type { NewsFeedDataLoaders } from '../modules/news-feed/news-feed.dataloader';
import type { ServiceInstanceDataLoaders } from '../modules/service/instance/service-instance.dataloader';
import { UserLoadUserBy } from './user';

export type PortalDataLoaders = {
  deploymentRequest: DeploymentRequestDataLoaders;
  document: DocumentDataLoaders;
  newsFeed: NewsFeedDataLoaders;
  serviceInstance: ServiceInstanceDataLoaders;
};

export interface PortalContext {
  user: UserLoadUserBy;
  referer?: string;
  req: express.Request;
  res: express.Response;
  dataLoaders: PortalDataLoaders;
}
