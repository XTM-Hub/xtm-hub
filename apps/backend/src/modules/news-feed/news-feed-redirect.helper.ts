import config from 'config';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
} from '../../__generated__/resolvers-types';

export interface NewsFeedDestination {
  url: string;
  // Host label reported in telemetry, e.g. filigran.io
  host: string;
  // Whether the standard utm query parameters of the incoming request are forwarded to the destination
  forwardUtmParams: boolean;
}

export type NewsFeedMetadataValues = Partial<
  Record<NewsFeedItemMetadataKey, string | null>
>;

interface NewsFeedDestinationDefinition {
  // Evaluated per redirect: the host follows the configured base url
  getHost: () => string;
  forwardUtmParams: boolean;
  // Returns undefined when the metadata cannot produce a safe destination
  buildUrl: (metadata: NewsFeedMetadataValues) => string | undefined;
}

// A single simple path segment: alphanumeric words joined by single '.', '_' or '-'.
// '/', '?', '#', '\', '%' (so every encoded variant, double-encoding included), '..' and leading or trailing dots are
// all excluded by construction.
const SAFE_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const SAFE_PATH_SEGMENT_MAX_LENGTH = 200;

const FILIGRAN_BLOG_PATH = '/blog/';

const getBlogBaseUrl = (): string => config.get<string>('blog_api.base_url');

// The five standard utm keys, the only ones the Hub ever sends. Anything else in the query is dropped, so a crafted
// link cannot add arbitrary parameters to the destination.
const FORWARDED_UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;
const UTM_VALUE_MAX_LENGTH = 100;

export const NewsFeedRedirectHelper = {
  isSafePathSegment: (value: string | null | undefined): value is string =>
    typeof value === 'string' &&
    value.length <= SAFE_PATH_SEGMENT_MAX_LENGTH &&
    SAFE_PATH_SEGMENT_PATTERN.test(value),

  // Builds a url from a fixed origin and a fixed path prefix, plus one validated segment.
  // Re-checks the parsed result so that a future builder cannot leave the expected origin or prefix.
  buildUrlWithSegment: ({
    origin,
    pathPrefix,
    segment,
  }: {
    origin: string;
    pathPrefix: string;
    segment: string | null | undefined;
  }): string | undefined => {
    if (!NewsFeedRedirectHelper.isSafePathSegment(segment)) {
      return undefined;
    }
    const url = new URL(`${pathPrefix}${segment}`, origin);
    const expectedOrigin = new URL(origin).origin;
    if (
      url.origin !== expectedOrigin ||
      url.pathname !== `${pathPrefix}${segment}` ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return undefined;
    }
    return url.toString();
  },

  // Appends the standard utm parameters of the incoming query, and nothing else: each key once, with a bounded value.
  appendUtmParams: (
    destinationUrl: string,
    query: Record<string, unknown>
  ): string => {
    const url = new URL(destinationUrl);
    FORWARDED_UTM_KEYS.forEach((key) => {
      const value = query[key];
      if (typeof value === 'string' && value.length <= UTM_VALUE_MAX_LENGTH) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  },
};

// One entry per item type that redirects outside the Hub. The host is fixed per type: adding a host is a visible change
// here, and only validated item metadata ever fills the path.
export const NewsFeedDestinationRegistry: Partial<
  Record<NewsFeedItemType, NewsFeedDestinationDefinition>
> = {
  [NewsFeedItemType.BlogPost]: {
    getHost: () => new URL(getBlogBaseUrl()).hostname,
    forwardUtmParams: true,
    // The blog post slug is the only value that fills the path, after the validation of buildUrlWithSegment
    buildUrl: (metadata) =>
      NewsFeedRedirectHelper.buildUrlWithSegment({
        // Same origin as the blog API client, so a staging Hub redirects to the staging blog
        origin: getBlogBaseUrl(),
        pathPrefix: FILIGRAN_BLOG_PATH,
        segment: metadata[NewsFeedItemMetadataKey.BlogPostSlug],
      }),
  },
};

export const buildNewsFeedDestination = (
  type: NewsFeedItemType,
  metadata: NewsFeedMetadataValues
): NewsFeedDestination | undefined => {
  // Own property only: the type column is a free string, so 'constructor' must not resolve to a builder
  if (!Object.hasOwn(NewsFeedDestinationRegistry, type)) {
    return undefined;
  }
  const definition = NewsFeedDestinationRegistry[type];
  if (!definition) {
    return undefined;
  }
  const url = definition.buildUrl(metadata);
  if (!url) {
    return undefined;
  }
  return {
    url,
    host: definition.getHost(),
    forwardUtmParams: definition.forwardUtmParams,
  };
};
