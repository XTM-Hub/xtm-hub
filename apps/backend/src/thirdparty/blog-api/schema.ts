import { z } from 'zod';
import { NewsFeedRedirectHelper } from '../../modules/news-feed/news-feed-redirect.helper';

export const BLOG_FEED_VERSION = 1;

// The envelope is checked first so that an invalid item can be reported with its own post id.
export const BlogFeedEnvelopeSchema = z.object({
  version: z.literal(BLOG_FEED_VERSION),
  items: z.array(z.unknown()),
});

// The article url is not read: the Hub redirect builds it from the slug.
export const buildBlogFeedItemSchema = (product: string) =>
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    slug: z
      .string()
      .refine(NewsFeedRedirectHelper.isSafePathSegment, 'Unsafe path segment'),
    published_at: z.iso
      .datetime({ offset: true })
      .refine((value) => Number.isFinite(Date.parse(value)), 'Invalid date'),
    image: z
      .object({
        url: z.url({ protocol: /^https$/ }),
        alt: z.string().nullish(),
      })
      .nullable(),
    products: z
      .array(z.string())
      .refine((products) => products.includes(product), {
        error: `Must contain the product ${product}`,
      }),
    summary: z.string().nullish(),
    authors: z.array(z.object({ name: z.string() })).default([]),
    categories: z
      .array(z.object({ slug: z.string(), label: z.string() }))
      .default([]),
    read_minutes: z.number().int().min(1).nullish(),
  });

export type BlogFeedItem = z.infer<ReturnType<typeof buildBlogFeedItemSchema>>;
