import { createHash } from 'crypto';
import type { Request, Response } from 'express';

export const CacheControl = {
  /** Cached by clients and proxies, but revalidated with the ETag on every use. */
  Revalidate: 'no-cache',
  /** Same as Revalidate, for responses that are public and shared across users. */
  PublicRevalidate: 'public, no-cache',
  /** For responses whose URL never serves other content. */
  Immutable: 'public, max-age=31536000, immutable',
} as const;

type CacheControlValue = (typeof CacheControl)[keyof typeof CacheControl];

/** Wraps a value in the quotes of a strong ETag, without altering it. */
export const quoteETag = (value: string): string => `"${value}"`;

/**
 * Strong ETag made of the sha256 of any string: a response payload, or a key
 * that changes whenever the content does.
 */
export const buildETag = (value: string): string =>
  quoteETag(createHash('sha256').update(value).digest('hex'));

/**
 * Sets the ETag and Cache-Control headers. When the client already holds the
 * current version, sends the 304 and returns true: the caller must then stop
 * and not write a body.
 */
export const respondNotModifiedIfFresh = (
  req: Request,
  res: Response,
  { etag, cacheControl }: { etag: string; cacheControl: CacheControlValue }
): boolean => {
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', cacheControl);
  if (req.fresh) {
    res.status(304).end();
    return true;
  }
  return false;
};
