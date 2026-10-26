import { createHash } from 'crypto';
import { Response } from 'express';

export const buildImageETag = (minioName: string): string =>
  `"${createHash('sha256').update(minioName).digest('hex')}"`;

// The URL of an image stays the same when its file is replaced (e.g. a
// connector logo), so clients must revalidate instead of caching blindly.
// The MinIO name changes with every upload, which makes it a reliable ETag.
export const setImageCacheHeaders = (res: Response, minioName: string) => {
  res.setHeader('ETag', buildImageETag(minioName));
  res.setHeader('Cache-Control', 'public, no-cache');
};
