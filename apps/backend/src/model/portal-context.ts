import express from 'express';

import type { DeploymentRequestDataLoaders } from '../modules/deployment/deployment.dataloader';
import type { DocumentDataLoaders } from '../modules/document/document.dataloader';
import type { FeatureVotingDataLoaders } from '../modules/feature-voting/feature-voting.dataloader';
import type { NewsFeedDataLoaders } from '../modules/news-feed/news-feed.dataloader';
import type { ServiceInstanceDataLoaders } from '../modules/service/instance/service-instance.dataloader';
import type { SubscriptionDataLoaders } from '../modules/subscription/subscription.dataloader';
import { UserLoadUserBy } from './user';

export type PortalDataLoaders = {
  deploymentRequest: DeploymentRequestDataLoaders;
  document: DocumentDataLoaders;
  featureVoting: FeatureVotingDataLoaders;
  newsFeed: NewsFeedDataLoaders;
  serviceInstance: ServiceInstanceDataLoaders;
  subscription: SubscriptionDataLoaders;
};

export interface PortalContext {
  user: UserLoadUserBy;
  referer?: string;
  req: express.Request;
  res: express.Response;
  dataLoaders: PortalDataLoaders;
}
