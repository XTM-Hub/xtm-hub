import type { NextFunction, Request, Response } from 'express';

// Browsers must trust the declared Content-Type: an uploaded file is never sniffed into a script or a stylesheet.
export const securityHeadersMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};
