import {
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import Document from '../../model/kanel/public/Document';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { doesVersionSatisfy, isValidVersion } from '../../utils/versioning';
import { isConnectorDocument } from '../shareable-resource/opencti/integration/integration.model';
import {
  NewsFeedConfiguration,
  newsFeedConfigurationMapping,
} from './news-feed.model';

export const doesPlatformSupportNewsFeed = (
  identifier: PlatformIdentifier,
  version?: string | null
): boolean => {
  const requiredVersion = RequiredPlatformVersions.NewsFeedSupport[identifier];
  if (!requiredVersion) return true;
  if (!version || !isValidVersion(version)) return false;
  return doesVersionSatisfy({ givenVersion: version, requiredVersion });
};

export const NewsFeedHelper = {
  getNewsFeedConfiguration: (
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier,
    document: Document
  ): NewsFeedConfiguration | undefined => {
    const newsFeedConfiguration =
      newsFeedConfigurationMapping[serviceDefinitionIdentifier];
    if (!newsFeedConfiguration) {
      return undefined;
    }

    if (isConnectorDocument(document)) {
      return undefined;
    }

    return newsFeedConfiguration;
  },
};
