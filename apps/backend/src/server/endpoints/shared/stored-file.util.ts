import type { Response } from 'express';

// Stored files are shown in Hub pages (img, CSS background), never run as a page: opened directly, an uploaded SVG or
// HTML gets no script, no plugin and a sandboxed origin.
export const STORED_FILE_CONTENT_SECURITY_POLICY =
  "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";

export const setStoredFileSecurityHeaders = (res: Response) => {
  res.setHeader('Content-Security-Policy', STORED_FILE_CONTENT_SECURITY_POLICY);
};
