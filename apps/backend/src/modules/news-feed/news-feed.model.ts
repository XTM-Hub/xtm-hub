import {
  NewsFeedItemType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';

export interface NewsFeedConfiguration {
  newsFeedType: NewsFeedItemType;
  platformIdentifier: PlatformIdentifier;
}

export const newsFeedConfigurationMapping: Partial<
  Record<ServiceDefinitionIdentifier, NewsFeedConfiguration>
> = {
  [ServiceDefinitionIdentifier.OpenctiCustomDashboards]: {
    newsFeedType: NewsFeedItemType.ResourceCustomDashboard,
    platformIdentifier: PlatformIdentifier.Opencti,
  },
  [ServiceDefinitionIdentifier.OpenctiPlaybooks]: {
    newsFeedType: NewsFeedItemType.ResourcePlaybook,
    platformIdentifier: PlatformIdentifier.Opencti,
  },
  [ServiceDefinitionIdentifier.OpenctiCustomViews]: {
    newsFeedType: NewsFeedItemType.ResourceCustomView,
    platformIdentifier: PlatformIdentifier.Opencti,
  },
  [ServiceDefinitionIdentifier.OpenctiIntegrations]: {
    newsFeedType: NewsFeedItemType.ResourceIntegration,
    platformIdentifier: PlatformIdentifier.Opencti,
  },
};
