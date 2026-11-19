import config from 'config';
import {
  Resolvers,
  SettingsCapability,
} from '../../__generated__/resolvers-types';
import portalConfig from '../../config';
import { resolveFeatureFlags } from '../../utils/feature-flag.util';

const resolvers: Resolvers = {
  Query: {
    settings: () => {
      return {
        capabilities: [SettingsCapability.ApiTokens],
        platform_providers: config.get('login_settings'),
        base_url_front: config.get('base_url_front'),
        environment: config.get('environment'),
        platform_feature_flags: resolveFeatureFlags(
          portalConfig.enabled_features
        ),
      };
    },
  },
};

export default resolvers;
