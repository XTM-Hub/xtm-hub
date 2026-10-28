import config from 'config';
import { BlogApiError, BlogApiErrorCode } from './errors';
import {
  BlogFeedEnvelopeSchema,
  type BlogFeedItem,
  buildBlogFeedItemSchema,
} from './schema';

const BLOG_FEED_PATH = '/api/feeds/blog';
// The Hub only serves English posts
const BLOG_FEED_LOCALE = 'en';

interface BlogFeedRequest {
  product: string;
  limit: number;
}

const getConfiguredTimeoutMs = (): number => {
  const timeoutMs = Number(config.get<number | string>('blog_api.timeout_ms'));
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Blog API timeout is not a positive integer');
  }
  return timeoutMs;
};

const toTransportError = (error: unknown): BlogApiError =>
  error instanceof DOMException && error.name === 'TimeoutError'
    ? new BlogApiError(BlogApiErrorCode.Timeout, 'Blog API timed out', {
        cause: error,
      })
    : new BlogApiError(BlogApiErrorCode.Unreachable, 'Blog API unreachable', {
        cause: error,
      });

// The post id is only reported when the raw item exposes a usable one.
const readPostId = (rawItem: unknown): string | undefined => {
  if (typeof rawItem !== 'object' || rawItem === null || !('id' in rawItem)) {
    return undefined;
  }
  const { id } = rawItem;
  return typeof id === 'string' || typeof id === 'number'
    ? String(id)
    : undefined;
};

// Newest first, then by id so that the order is stable when two posts share a date.
const compareItems = (a: BlogFeedItem, b: BlogFeedItem): number => {
  const byDate = Date.parse(b.published_at) - Date.parse(a.published_at);
  if (byDate !== 0) {
    return byDate;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
};

const parseFeed = (
  body: unknown,
  { product, limit }: BlogFeedRequest
): BlogFeedItem[] => {
  const envelope = BlogFeedEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    throw new BlogApiError(
      BlogApiErrorCode.InvalidFeed,
      `Blog API feed is invalid: ${envelope.error.message}`
    );
  }

  const itemSchema = buildBlogFeedItemSchema(product);
  const items = envelope.data.items.map((rawItem) => {
    const item = itemSchema.safeParse(rawItem);
    if (!item.success) {
      const postId = readPostId(rawItem);
      throw new BlogApiError(
        BlogApiErrorCode.InvalidItem,
        `Blog API item ${postId ?? '(without id)'} is invalid: ${item.error.message}`,
        { postId }
      );
    }
    return item.data;
  });

  // The API may ignore the limit: keep the newest items only
  return items.sort(compareItems).slice(0, limit);
};

export const BlogApiClient = {
  // Reads the whole feed first: nothing is returned unless every item is valid.
  async fetchBlogFeed(request: BlogFeedRequest): Promise<BlogFeedItem[]> {
    const baseUrl = config.get<string | null>('blog_api.base_url');
    if (!baseUrl) {
      throw new Error('Blog API base URL is not configured');
    }

    const url = new URL(BLOG_FEED_PATH, baseUrl);
    url.searchParams.set('product', request.product);
    url.searchParams.set('limit', String(request.limit));
    url.searchParams.set('locale', BLOG_FEED_LOCALE);

    // The timeout covers the headers and the body
    const signal = AbortSignal.timeout(getConfiguredTimeoutMs());

    let response: Response;
    try {
      // Public feed: no credentials. A redirect is not followed and shows up as an unexpected status.
      response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'manual',
        signal,
      });
    } catch (error) {
      throw toTransportError(error);
    }

    if (response.status !== 200) {
      await response.body?.cancel();
      throw new BlogApiError(
        BlogApiErrorCode.UnexpectedStatus,
        `Blog API answered with the status ${response.status}`,
        { status: response.status }
      );
    }

    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      throw toTransportError(error);
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new BlogApiError(
        BlogApiErrorCode.InvalidJson,
        'Blog API answered with an invalid JSON',
        { cause: error }
      );
    }

    return parseFeed(body, request);
  },
};
