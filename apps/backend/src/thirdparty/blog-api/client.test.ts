import config from 'config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlogApiClient } from './client';
import { BlogApiError, BlogApiErrorCode } from './errors';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

const BASE_URL = 'https://blog.test';
const TIMEOUT_MS = 4321;
const PRODUCT = 'opencti';
const LIMIT = 6;
const FEED_PATH = '/api/feeds/blog';
const realConfigGet = vi.mocked(config.get).getMockImplementation();

const useConfig = (overrides: Record<string, string | number | null>) => {
  vi.mocked(config.get).mockImplementation((key: string) =>
    key in overrides ? overrides[key] : realConfigGet?.(key)
  );
};

// A real post of the blog API, shortened
const SAMPLE_FEED = {
  version: 1,
  product: 'opencti',
  locale: 'en',
  generated_at: '2026-10-07T09:00:00Z',
  items: [
    {
      id: 'post-614',
      url: 'https://filigran.io/blog/opencti-and-google-secops-soar-threat-intel-flows-both-ways',
      slug: 'opencti-and-google-secops-soar-threat-intel-flows-both-ways',
      title: 'OpenCTI and Google SecOps SOAR: Threat intel flows both ways',
      summary:
        'How the new integration moves intelligence between OpenCTI and SOAR playbooks.',
      image: {
        url: 'https://filigran.io/api/media/file/OpenCTI-Google-SecOps-SOAR-g8yndc1YgMOyEesxSUvmDErGO555iH.png',
        width: 1400,
        height: 732,
        alt: 'Featured image for the OpenCTI and Google SecOps SOAR integration blog post',
      },
      authors: [
        {
          name: 'Romain Guignard',
          role: 'Product Manager - OpenCTI',
          avatar: 'https://filigran.io/api/media/file/romain-guignard.png',
        },
      ],
      categories: [
        { slug: 'threat-intelligence', label: 'Threat Intelligence' },
        { slug: 'partnership', label: 'Partnership' },
      ],
      products: ['opencti'],
      read_minutes: 7,
      published_at: '2026-09-11T08:00:00Z',
      updated_at: '2026-09-12T14:21:05Z',
    },
  ],
};

const SAMPLE_ITEM = SAMPLE_FEED.items[0];

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  ...SAMPLE_ITEM,
  ...overrides,
});

const makeFeed = (
  items: unknown[],
  overrides: Record<string, unknown> = {}
) => ({
  ...SAMPLE_FEED,
  items,
  ...overrides,
});

const stubFetch = (response: Response) => {
  const fetchMock = vi.fn(async (_url: URL, _init?: RequestInit) => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const stubFeed = (body: unknown) => stubFetch(Response.json(body));

const stubFetchRejection = (error: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw error;
    })
  );
};

const fetchBlogFeed = (request = { product: PRODUCT, limit: LIMIT }) =>
  BlogApiClient.fetchBlogFeed(request);

const catchBlogApiError = async (
  promise: Promise<unknown>
): Promise<BlogApiError> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof BlogApiError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the blog API call to fail');
};

describe('blogApiClient.fetchBlogFeed', () => {
  beforeEach(() => {
    useConfig({
      'blog_api.base_url': BASE_URL,
      'blog_api.timeout_ms': TIMEOUT_MS,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('request', () => {
    it('should send an unauthenticated GET with the product, limit and locale when fetching the feed', async () => {
      // Given
      const fetchMock = stubFeed(SAMPLE_FEED);

      // When
      await fetchBlogFeed();

      // Then
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url.origin).toBe(BASE_URL);
      expect(url.pathname).toBe(FEED_PATH);
      expect(Object.fromEntries(url.searchParams)).toStrictEqual({
        product: PRODUCT,
        limit: String(LIMIT),
        locale: 'en',
      });
      expect(init).toMatchObject({ method: 'GET', redirect: 'manual' });
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBeNull();
      expect(headers.get('Cookie')).toBeNull();
    });

    it('should arm the configured timeout when fetching the feed', async () => {
      // Given
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      stubFeed(SAMPLE_FEED);

      // When
      await fetchBlogFeed();

      // Then
      expect(timeoutSpy).toHaveBeenCalledWith(TIMEOUT_MS);
    });

    it.each([null, ''])(
      'should throw when the base URL is %j',
      async (baseUrl) => {
        // Given
        useConfig({ 'blog_api.base_url': baseUrl });
        const fetchMock = stubFeed(SAMPLE_FEED);

        // When
        const result = fetchBlogFeed();

        // Then
        await expect(result).rejects.toThrow(
          'Blog API base URL is not configured'
        );
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );

    it.each([0, -1, Number.NaN, 1.5])(
      'should throw when the limit is %j',
      async (limit) => {
        // Given
        const fetchMock = stubFeed(SAMPLE_FEED);

        // When
        const result = fetchBlogFeed({ product: PRODUCT, limit });

        // Then
        await expect(result).rejects.toThrow(
          'Blog API limit is not a positive integer'
        );
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );

    it.each([0, -1, 1.5, 'soon'])(
      'should throw when the timeout is %j',
      async (timeoutMs) => {
        // Given
        useConfig({ 'blog_api.timeout_ms': timeoutMs });
        const fetchMock = stubFeed(SAMPLE_FEED);

        // When
        const result = fetchBlogFeed();

        // Then
        await expect(result).rejects.toThrow(
          'Blog API timeout is not a positive integer'
        );
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );
  });

  describe('valid feed', () => {
    it('should return the items of the sample feed when the response is valid', async () => {
      // Given
      stubFeed(SAMPLE_FEED);

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'post-614',
        slug: 'opencti-and-google-secops-soar-threat-intel-flows-both-ways',
        title: 'OpenCTI and Google SecOps SOAR: Threat intel flows both ways',
        summary:
          'How the new integration moves intelligence between OpenCTI and SOAR playbooks.',
        published_at: '2026-09-11T08:00:00Z',
        image: {
          url: 'https://filigran.io/api/media/file/OpenCTI-Google-SecOps-SOAR-g8yndc1YgMOyEesxSUvmDErGO555iH.png',
          alt: 'Featured image for the OpenCTI and Google SecOps SOAR integration blog post',
        },
        authors: [{ name: 'Romain Guignard' }],
        categories: [
          { slug: 'threat-intelligence', label: 'Threat Intelligence' },
          { slug: 'partnership', label: 'Partnership' },
        ],
        products: ['opencti'],
        read_minutes: 7,
      });
    });

    it('should return an empty list when the API has no post', async () => {
      // Given
      stubFeed(makeFeed([]));

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items).toStrictEqual([]);
    });

    it('should accept a post without image when the image is null', async () => {
      // Given
      stubFeed(makeFeed([makeItem({ image: null })]));

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items[0]).toMatchObject({ id: 'post-614', image: null });
    });

    it.each([
      ['an unsafe value', 'https://evil.test/a?b=c#d'],
      ['an empty value', ''],
      ['a missing value', undefined],
    ])(
      'should ignore the article url when it is %s',
      async (_label, articleUrl) => {
        // Given
        stubFeed(makeFeed([makeItem({ url: articleUrl })]));

        // When
        const items = await fetchBlogFeed();

        // Then
        expect(items).toHaveLength(1);
        expect(items[0]).not.toHaveProperty('url');
      }
    );

    it('should accept a post that carries other products when it contains the requested one', async () => {
      // Given
      stubFeed(makeFeed([makeItem({ products: ['openaev', 'opencti'] })]));

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items[0]).toMatchObject({ products: ['openaev', 'opencti'] });
    });

    it('should accept a date with an offset when it is a valid ISO date', async () => {
      // Given
      stubFeed(
        makeFeed([makeItem({ published_at: '2026-09-11T10:00:00+02:00' })])
      );

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items[0]).toMatchObject({
        published_at: '2026-09-11T10:00:00+02:00',
      });
    });

    it.each([
      ['null', null],
      ['missing', undefined],
      ['an empty string', ''],
      ['blank', '   '],
      ['not a string', 42],
    ])('should drop an author when its name is %s', async (_label, name) => {
      // Given
      const guestAuthor = { name, role: null, avatar: null };
      stubFeed(
        makeFeed([
          makeItem({
            authors: [
              guestAuthor,
              { name: 'Romain Guignard' },
              null,
              'Anonymous',
            ],
          }),
        ])
      );

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items[0].authors).toStrictEqual([{ name: 'Romain Guignard' }]);
    });

    it('should return no author when every author has no name', async () => {
      // Given
      stubFeed(makeFeed([makeItem({ authors: [{ name: null }] })]));

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items[0].authors).toStrictEqual([]);
    });

    it.each([
      ['0', 0],
      ['null', null],
      ['missing', undefined],
    ])(
      'should return an undefined read time when it is %s',
      async (_label, readMinutes) => {
        // Given
        stubFeed(makeFeed([makeItem({ read_minutes: readMinutes })]));

        // When
        const items = await fetchBlogFeed();

        // Then
        expect(items[0].read_minutes).toBeUndefined();
      }
    );
  });

  describe('ordering and limit', () => {
    const NEWEST = makeItem({
      id: 'post-3',
      slug: 'post-3',
      published_at: '2026-10-03T08:00:00Z',
    });
    const SAME_DATE_FIRST_ID = makeItem({
      id: 'post-1',
      slug: 'post-1',
      published_at: '2026-10-02T08:00:00Z',
    });
    const SAME_DATE_SECOND_ID = makeItem({
      id: 'post-2',
      slug: 'post-2',
      published_at: '2026-10-02T08:00:00Z',
    });
    const OLDEST = makeItem({
      id: 'post-0',
      slug: 'post-0',
      published_at: '2026-10-01T08:00:00Z',
    });

    it('should sort by publication date descending then by id when the API order differs', async () => {
      // Given
      stubFeed(
        makeFeed([OLDEST, SAME_DATE_SECOND_ID, NEWEST, SAME_DATE_FIRST_ID])
      );

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items.map(({ id }) => id)).toStrictEqual([
        'post-3',
        'post-1',
        'post-2',
        'post-0',
      ]);
    });

    it('should compare the dates as instants when the offsets differ', async () => {
      // Given
      const earlierInstant = makeItem({
        id: 'post-a',
        slug: 'post-a',
        published_at: '2026-10-02T09:00:00+02:00',
      });
      const laterInstant = makeItem({
        id: 'post-b',
        slug: 'post-b',
        published_at: '2026-10-02T08:00:00Z',
      });
      stubFeed(makeFeed([earlierInstant, laterInstant]));

      // When
      const items = await fetchBlogFeed();

      // Then
      expect(items.map(({ id }) => id)).toStrictEqual(['post-b', 'post-a']);
    });

    it('should keep only the newest items when the API ignores the limit', async () => {
      // Given
      stubFeed(
        makeFeed([OLDEST, SAME_DATE_SECOND_ID, NEWEST, SAME_DATE_FIRST_ID])
      );

      // When
      const items = await fetchBlogFeed({ product: PRODUCT, limit: 3 });

      // Then
      expect(items.map(({ id }) => id)).toStrictEqual([
        'post-3',
        'post-1',
        'post-2',
      ]);
    });

    it('should return every item when there are fewer than the limit', async () => {
      // Given
      stubFeed(makeFeed([OLDEST, NEWEST]));

      // When
      const items = await fetchBlogFeed({ product: PRODUCT, limit: 6 });

      // Then
      expect(items.map(({ id }) => id)).toStrictEqual(['post-3', 'post-0']);
    });
  });

  describe('typed errors', () => {
    it('should throw an unreachable error when the request fails', async () => {
      // Given
      const networkError = new TypeError('fetch failed');
      stubFetchRejection(networkError);

      // When
      const error = await catchBlogApiError(fetchBlogFeed());

      // Then
      expect(error).toMatchObject({
        code: BlogApiErrorCode.Unreachable,
        cause: networkError,
      });
    });

    it('should throw a timeout error when the request times out', async () => {
      // Given
      stubFetchRejection(
        new DOMException('The operation timed out.', 'TimeoutError')
      );

      // When
      const error = await catchBlogApiError(fetchBlogFeed());

      // Then
      expect(error.code).toBe(BlogApiErrorCode.Timeout);
    });

    it('should throw a timeout error when the body read times out', async () => {
      // Given
      const response = new Response('{}');
      vi.spyOn(response, 'text').mockRejectedValue(
        new DOMException('The operation timed out.', 'TimeoutError')
      );
      stubFetch(response);

      // When
      const error = await catchBlogApiError(fetchBlogFeed());

      // Then
      expect(error.code).toBe(BlogApiErrorCode.Timeout);
    });

    it('should throw an unreachable error when the body read fails', async () => {
      // Given
      const response = new Response('{}');
      vi.spyOn(response, 'text').mockRejectedValue(new TypeError('terminated'));
      stubFetch(response);

      // When
      const error = await catchBlogApiError(fetchBlogFeed());

      // Then
      expect(error.code).toBe(BlogApiErrorCode.Unreachable);
    });

    it.each([204, 301, 304, 400, 404, 500, 503])(
      'should throw an unexpected status error when the API answers %i',
      async (status) => {
        // Given
        stubFetch(new Response(null, { status }));

        // When
        const error = await catchBlogApiError(fetchBlogFeed());

        // Then
        expect(error).toMatchObject({
          code: BlogApiErrorCode.UnexpectedStatus,
          status,
        });
      }
    );

    it.each([
      ['an empty body', ''],
      ['a truncated body', '{"version": 1, "items": ['],
      ['an HTML page', '<html><body>Maintenance</body></html>'],
    ])(
      'should throw an invalid JSON error when the body is %s',
      async (_label, body) => {
        // Given
        stubFetch(new Response(body, { status: 200 }));

        // When
        const error = await catchBlogApiError(fetchBlogFeed());

        // Then
        expect(error.code).toBe(BlogApiErrorCode.InvalidJson);
      }
    );

    it.each([
      ['a version other than 1', makeFeed([SAMPLE_ITEM], { version: 2 })],
      ['a missing version', { items: [SAMPLE_ITEM] }],
      ['a version as a string', makeFeed([SAMPLE_ITEM], { version: '1' })],
      ['missing items', { version: 1 }],
      ['items that are not an array', makeFeed([], { items: SAMPLE_ITEM })],
      ['a null body', null],
      ['an array body', [SAMPLE_ITEM]],
    ])(
      'should throw an invalid feed error when the response has %s',
      async (_label, body) => {
        // Given
        stubFeed(body);

        // When
        const error = await catchBlogApiError(fetchBlogFeed());

        // Then
        expect(error.code).toBe(BlogApiErrorCode.InvalidFeed);
      }
    );

    it.each([
      ['a missing title', { title: undefined }],
      ['an empty title', { title: '' }],
      ['a title that is not a string', { title: 42 }],
      ['a missing slug', { slug: undefined }],
      ['an empty slug', { slug: '' }],
      ['a slug with a slash', { slug: 'a/b' }],
      ['a slug with a question mark', { slug: 'a?b=c' }],
      ['a slug with a hash', { slug: 'a#b' }],
      ['a slug with a backslash', { slug: 'a\\b' }],
      ['a slug that is a parent segment', { slug: '..' }],
      ['a slug with a dot dot', { slug: 'a..b' }],
      ['a slug with an encoded slash', { slug: 'a%2Fb' }],
      ['a slug with an encoded dot dot', { slug: '%2e%2e' }],
      ['a slug with a double encoded slash', { slug: 'a%252Fb' }],
      ['a slug with a leading dot', { slug: '.hidden' }],
      ['a slug with a space', { slug: 'a b' }],
      ['a missing publication date', { published_at: undefined }],
      ['a publication date that is not a date', { published_at: 'yesterday' }],
      ['a publication date without time', { published_at: '2026-09-11' }],
      [
        'a publication date that does not exist',
        { published_at: '2026-02-30T08:00:00Z' },
      ],
      ['a missing image', { image: undefined }],
      ['an image without url', { image: { alt: 'No url' } }],
      [
        'an image with an http url',
        { image: { url: 'http://filigran.io/a.png' } },
      ],
      [
        'an image with a javascript url',
        { image: { url: 'javascript:alert(1)' } },
      ],
      ['an image with a relative url', { image: { url: '/api/media/a.png' } }],
      ['a missing products list', { products: undefined }],
      ['products without the requested one', { products: ['openaev'] }],
      ['empty products', { products: [] }],
      ['a negative read time', { read_minutes: -1 }],
      ['a read time that is not an integer', { read_minutes: 1.5 }],
      ['a read time that is not a number', { read_minutes: '7' }],
      ['authors that are not an array', { authors: 'Romain Guignard' }],
      ['authors that are null', { authors: null }],
      ['authors that are an object', { authors: { name: 'Romain Guignard' } }],
      ['categories that are not an array', { categories: 'partnership' }],
      ['categories that are null', { categories: null }],
      ['a category without label', { categories: [{ slug: 'partnership' }] }],
    ])(
      'should throw an invalid item error with the post id when the item has %s',
      async (_label, overrides) => {
        // Given
        const validItem = makeItem({ id: 'post-1', slug: 'post-1' });
        stubFeed(
          makeFeed([validItem, makeItem({ id: 'post-2', ...overrides })])
        );

        // When
        const error = await catchBlogApiError(fetchBlogFeed());

        // Then
        expect(error).toMatchObject({
          code: BlogApiErrorCode.InvalidItem,
          postId: 'post-2',
        });
        expect(error.message).toContain('post-2');
      }
    );

    it.each([
      ['a missing id', { id: undefined }, undefined],
      ['an empty id', { id: '' }, ''],
      ['an id that is not a string', { id: 614 }, '614'],
    ])(
      'should throw an invalid item error when the item has %s',
      async (_label, overrides, expectedPostId) => {
        // Given
        stubFeed(makeFeed([makeItem(overrides)]));

        // When
        const error = await catchBlogApiError(fetchBlogFeed());

        // Then
        expect(error.code).toBe(BlogApiErrorCode.InvalidItem);
        expect(error.postId).toBe(expectedPostId);
      }
    );

    it.each([
      ['null', null],
      ['a string', 'post-1'],
      ['a number', 1],
    ])(
      'should throw an invalid item error without post id when an item is %s',
      async (_label, rawItem) => {
        // Given
        stubFeed(makeFeed([SAMPLE_ITEM, rawItem]));

        // When
        const error = await catchBlogApiError(fetchBlogFeed());

        // Then
        expect(error.code).toBe(BlogApiErrorCode.InvalidItem);
        expect(error.postId).toBeUndefined();
      }
    );

    it.each([
      ['the same id', { id: 'post-614', slug: 'another-slug' }, 'post-614'],
      ['the same slug', { id: 'post-2', slug: SAMPLE_ITEM.slug }, 'post-2'],
    ])(
      'should throw an invalid item error with the post id when two items have %s',
      async (_label, overrides, expectedPostId) => {
        // Given
        stubFeed(makeFeed([SAMPLE_ITEM, makeItem(overrides)]));

        // When
        const error = await catchBlogApiError(fetchBlogFeed());

        // Then
        expect(error).toMatchObject({
          code: BlogApiErrorCode.InvalidItem,
          postId: expectedPostId,
        });
      }
    );

    it('should return nothing when a single item of the response is invalid', async () => {
      // Given
      stubFeed(
        makeFeed([SAMPLE_ITEM, makeItem({ id: 'post-2', slug: 'a/b' })])
      );

      // When
      const result = fetchBlogFeed();

      // Then
      await expect(result).rejects.toMatchObject({
        code: BlogApiErrorCode.InvalidItem,
        postId: 'post-2',
      });
    });
  });
});
