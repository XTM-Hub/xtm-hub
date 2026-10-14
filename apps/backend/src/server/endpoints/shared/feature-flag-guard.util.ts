import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { FeatureFlag } from '../../../__generated__/resolvers-types';
import { isFeatureEnabled } from '../../../utils/feature-flag.util';

export const requireFeatureFlag =
  (
    flag: FeatureFlag,
    sendFeatureNotAvailable: (res: Response) => void
  ): RequestHandler =>
  (_req: Request, res: Response, next: NextFunction): void => {
    if (!isFeatureEnabled(flag)) {
      sendFeatureNotAvailable(res);
      return;
    }
    next();
  };
