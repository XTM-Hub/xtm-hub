import { z } from 'zod';
import { NewsFeedRedirectHelper } from '../../modules/news-feed/news-feed-redirect.helper';

export const BLOG_FEED_VERSION = 1;

// The envelope is checked first so that an invalid item can be reported with its own post id.
export const BlogFeedEnvelopeSchema = z.object({
  version: z.literal(BLOG_FEED_VERSION),
  items: z.array(z.unknown()),
});

const AuthorSchema = z.object({ name: z.string().nullish() });

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
    // A guest author can have no name: such entries are dropped, the post stays valid
    authors: z
      .array(z.unknown())
      .default([])
      .transform((entries) =>
        entries.flatMap((entry) => {
          const author = AuthorSchema.safeParse(entry);
          return author.success && author.data.name?.trim()
            ? [{ name: author.data.name }]
            : [];
        })
      ),
    categories: z
      .array(z.object({ slug: z.string(), label: z.string() }))
      .default([]),
    // An absent, null or zero read time means "unknown"
    read_minutes: z
      .number()
      .int()
      .min(0)
      .nullish()
      .transform((minutes) => minutes || undefined),
  });

export type BlogFeedItem = z.infer<ReturnType<typeof buildBlogFeedItemSchema>>;
