import { PlatformIdentifier } from '../__generated__/resolvers-types';

type RequiredPlatformVersionsConfig = {
  RefreshConnectivityStatusSendsNotFound: Record<
    PlatformIdentifier,
    string | null
  >;
  TenantIdRequired: Record<PlatformIdentifier, string | null>;
  NewsFeedSupport: Record<PlatformIdentifier, string | null>;
  NewsFeedBlogpostSupport: Record<PlatformIdentifier, string | null>;
};

// A null value means the feature is disabled/not required for that identifier.
// For NewsFeedSupport and NewsFeedBlogpostSupport, null means the news feed is disabled: no item is provisioned,
// whatever the platform version. Xtmone: every version handles the not_found status. News feed and tenants
// are not supported by XTM One, hence null.
export const RequiredPlatformVersions: RequiredPlatformVersionsConfig = {
  RefreshConnectivityStatusSendsNotFound: {
    [PlatformIdentifier.Opencti]: '6.8.16',
    [PlatformIdentifier.Openaev]: '2.0.6',
    [PlatformIdentifier.Xtmone]: '0.0.0',
  },
  TenantIdRequired: {
    [PlatformIdentifier.Opencti]: null,
    [PlatformIdentifier.Openaev]: '2.4.0',
    [PlatformIdentifier.Xtmone]: null,
  },
  NewsFeedSupport: {
    [PlatformIdentifier.Opencti]: '7.260527.0', // OpenCTI 7.260527.0 is the first version to support news feed
    [PlatformIdentifier.Openaev]: '1.0.0', // Placeholder until the first OpenAEV version that reads news feed items is released
    [PlatformIdentifier.Xtmone]: null,
  },
  // Stays null until the first OpenCTI version that renders blogpost items is released, so the Hub ships dark.
  NewsFeedBlogpostSupport: {
    [PlatformIdentifier.Opencti]: null,
    [PlatformIdentifier.Openaev]: null,
    [PlatformIdentifier.Xtmone]: null,
  },
};
