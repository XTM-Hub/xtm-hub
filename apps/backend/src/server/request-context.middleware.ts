import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requestContext } from '../context/request.context';

export const requestContextMiddleware = function (
  req: Request,
  _res: Response,
  next: NextFunction
) {
  requestContext.run(
    {
      user: req.session.user,
      correlationId: uuidv4(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      referer: req.headers.referer,
      organizationId: req.session.user?.selected_organization_id,
    },
    () => {
      next();
    }
  );
};
