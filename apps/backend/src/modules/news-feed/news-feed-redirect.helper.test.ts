import { describe, expect, it } from 'vitest';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
} from '../../__generated__/resolvers-types';
import {
  buildNewsFeedDestination,
  NewsFeedDestinationRegistry,
  NewsFeedRedirectHelper,
} from './news-feed-redirect.helper';

const BLOG_POST_SLUG = 'threat-report-2026';
const BLOG_POST_URL = `https://filigran.io/blog/${BLOG_POST_SLUG}`;

const UNSAFE_SEGMENTS: [string, string][] = [
  ['a slash', 'a/b'],
  ['a leading slash', '/a'],
  ['a question mark', 'a?b=1'],
  ['a hash', 'a#b'],
  ['a backslash', 'a\\b'],
  ['a dot dot', '..'],
  ['an embedded dot dot', 'a..b'],
  ['a single dot', '.'],
  ['a leading dot', '.hidden'],
  ['a trailing dot', 'a.'],
  ['an encoded slash', 'a%2fb'],
  ['an uppercase encoded slash', 'a%2Fb'],
  ['an encoded dot', '%2e%2e'],
  ['an encoded backslash', 'a%5cb'],
  ['an encoded hash', 'a%23b'],
  ['an encoded question mark', 'a%3fb'],
  ['a double-encoded slash', 'a%252fb'],
  ['a space', 'a b'],
  ['a newline', 'a\nb'],
  ['an at sign', 'a@evil.com'],
  ['a colon', 'a:b'],
  ['an empty string', ''],
  ['a non-ASCII character', 'café'],
  ['a too long value', 'a'.repeat(201)],
];

describe('news-feed-redirect.helper', () => {
  describe('isSafePathSegment', () => {
    it.each(['report', 'threat-report-2026', 'a.b', 'a_b', 'A1', '2026'])(
      'should accept the simple path segment "%s"',
      (segment) => {
        expect(NewsFeedRedirectHelper.isSafePathSegment(segment)).toBe(true);
      }
    );

    it.each(UNSAFE_SEGMENTS)(
      'should refuse a path segment with %s',
      (_description, segment) => {
        expect(NewsFeedRedirectHelper.isSafePathSegment(segment)).toBe(false);
      }
    );

    it.each([[null], [undefined]])(
      'should refuse a missing path segment (%s)',
      (segment) => {
        expect(NewsFeedRedirectHelper.isSafePathSegment(segment)).toBe(false);
      }
    );
  });

  describe('buildUrlWithSegment', () => {
    it('should build the url from the fixed origin and path prefix', () => {
      const url = NewsFeedRedirectHelper.buildUrlWithSegment({
        origin: 'https://filigran.io',
        pathPrefix: '/blog/',
        segment: BLOG_POST_SLUG,
      });

      expect(url).toBe(BLOG_POST_URL);
    });

    // The unsafe segments are exhaustively covered by isSafePathSegment
    it.each(UNSAFE_SEGMENTS.slice(0, 3))(
      'should not build a url for a segment with %s',
      (_description, segment) => {
        const url = NewsFeedRedirectHelper.buildUrlWithSegment({
          origin: 'https://filigran.io',
          pathPrefix: '/blog/',
          segment,
        });

        expect(url).toBeUndefined();
      }
    );
  });

  describe('appendUtmParams', () => {
    it('should forward the standard utm parameters and nothing else', () => {
      const url = NewsFeedRedirectHelper.appendUtmParams(BLOG_POST_URL, {
        utm_source: 'opencti',
        utm_medium: 'newsfeed',
        utm_campaign: 'blog_posts',
        utm_content: 'blog_posts',
        utm_term: 'term',
        platform_id: '9b0c7a3e-1111-4a9e-8d6f-0d4f5a7c9e10',
        redirect: 'https://evil.example',
        UTM_SOURCE: 'upper',
        utm: 'no-underscore',
      });

      expect(url).toBe(
        `${BLOG_POST_URL}?utm_source=opencti&utm_medium=newsfeed&utm_campaign=blog_posts&utm_content=blog_posts&utm_term=term`
      );
    });

    it('should drop the utm keys that are not standard', () => {
      const url = NewsFeedRedirectHelper.appendUtmParams(BLOG_POST_URL, {
        utm_source: 'opencti',
        utm_junk: 'x',
        utm_anything_else: 'y',
      });

      expect(url).toBe(`${BLOG_POST_URL}?utm_source=opencti`);
    });

    it('should encode the forwarded values', () => {
      const url = NewsFeedRedirectHelper.appendUtmParams(BLOG_POST_URL, {
        utm_content: 'a&b=c#d',
      });

      expect(url).toBe(`${BLOG_POST_URL}?utm_content=a%26b%3Dc%23d`);
    });

    it('should ignore repeated and non string values', () => {
      const url = NewsFeedRedirectHelper.appendUtmParams(BLOG_POST_URL, {
        utm_term: ['a', 'b'],
        utm_campaign: { nested: 'x' },
      });

      expect(url).toBe(BLOG_POST_URL);
    });

    it('should drop a value longer than the limit and keep one at the limit', () => {
      const url = NewsFeedRedirectHelper.appendUtmParams(BLOG_POST_URL, {
        utm_source: 'a'.repeat(101),
        utm_campaign: 'b'.repeat(100),
      });

      expect(url).toBe(`${BLOG_POST_URL}?utm_campaign=${'b'.repeat(100)}`);
    });

    it('should leave the url untouched when the query has no utm parameter', () => {
      const url = NewsFeedRedirectHelper.appendUtmParams(BLOG_POST_URL, {
        platform_id: 'x',
      });

      expect(url).toBe(BLOG_POST_URL);
    });
  });

  describe('buildNewsFeedDestination', () => {
    it('should build the filigran.io blog post destination from the blog_post_slug metadata', () => {
      const destination = buildNewsFeedDestination(NewsFeedItemType.BlogPost, {
        [NewsFeedItemMetadataKey.BlogPostSlug]: BLOG_POST_SLUG,
        [NewsFeedItemMetadataKey.UrlPath]: 'redirect/news-feed/ignored',
      });

      expect(destination).toEqual({
        url: BLOG_POST_URL,
        host: 'filigran.io',
        forwardUtmParams: true,
      });
    });

    it.each([
      [
        'an unsafe blog_post_slug',
        { [NewsFeedItemMetadataKey.BlogPostSlug]: 'a/b' },
      ],
      ['no blog_post_slug', {}],
    ])('should refuse a blog post with %s', (_description, metadata) => {
      expect(
        buildNewsFeedDestination(NewsFeedItemType.BlogPost, metadata)
      ).toBeUndefined();
    });

    it.each([
      NewsFeedItemType.ResourceCustomDashboard,
      NewsFeedItemType.ResourceCustomView,
      NewsFeedItemType.ResourceIntegration,
      NewsFeedItemType.ResourcePlaybook,
      'constructor',
      '__proto__',
      'UNKNOWN_TYPE',
    ])('should have no destination for the type "%s"', (type) => {
      expect(
        buildNewsFeedDestination(type as NewsFeedItemType, {
          [NewsFeedItemMetadataKey.BlogPostSlug]: BLOG_POST_SLUG,
        })
      ).toBeUndefined();
    });
  });

  describe('newsFeedDestinationRegistry', () => {
    it('should only register the blog post type', () => {
      expect(Object.keys(NewsFeedDestinationRegistry)).toEqual([
        NewsFeedItemType.BlogPost,
      ]);
    });
  });
});
