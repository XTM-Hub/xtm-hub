import crypto from 'node:crypto';

export const buildETag = (payload: string): string =>
  `"${crypto.createHash('sha256').update(payload).digest('hex')}"`;
