import {
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
} from '../../__generated__/resolvers-types';

export interface NewsFeedDestination {
  url: string;
  // Host label reported in telemetry, e.g. filigran.io
  host: string;
  // Whether the utm_* query parameters of the incoming request are forwarded to the destination
  forwardUtmParams: boolean;
}

export type NewsFeedMetadataValues = Partial<
  Record<NewsFeedItemMetadataKey, string | null>
>;

interface NewsFeedDestinationDefinition {
  host: string;
  forwardUtmParams: boolean;
  // Returns undefined when the metadata cannot produce a safe destination
  buildUrl: (metadata: NewsFeedMetadataValues) => string | undefined;
}

// A single simple path segment: alphanumeric words joined by single '.', '_' or '-'.
// '/', '?', '#', '\', '%' (so every encoded variant, double-encoding included), '..' and leading or trailing dots are
// all excluded by construction.
const SAFE_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const SAFE_PATH_SEGMENT_MAX_LENGTH = 200;

export const FILIGRAN_WEBSITE_ORIGIN = 'https://www.filigran.io';
export const FILIGRAN_WEBSITE_HOST_LABEL = 'filigran.io';
const FILIGRAN_BLOG_PATH = '/blog/';

const UTM_PARAM_PATTERN = /^utm_[A-Za-z0-9_]+$/;

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

  // Appends the utm_* parameters of the incoming query, and nothing else.
  appendUtmParams: (
    destinationUrl: string,
    query: Record<string, unknown>
  ): string => {
    const url = new URL(destinationUrl);
    Object.entries(query).forEach(([key, value]) => {
      if (!UTM_PARAM_PATTERN.test(key)) {
        return;
      }
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        if (typeof item === 'string') {
          url.searchParams.append(key, item);
        }
      });
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
    host: FILIGRAN_WEBSITE_HOST_LABEL,
    forwardUtmParams: true,
    // Test purposes only: reuses the document_id metadata key as the blog post slug
    buildUrl: (metadata) =>
      NewsFeedRedirectHelper.buildUrlWithSegment({
        origin: FILIGRAN_WEBSITE_ORIGIN,
        pathPrefix: FILIGRAN_BLOG_PATH,
        segment: metadata[NewsFeedItemMetadataKey.DocumentId],
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
    host: definition.host,
    forwardUtmParams: definition.forwardUtmParams,
  };
};
