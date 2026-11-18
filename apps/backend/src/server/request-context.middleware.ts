import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requestContext } from '../context/request.context';
import { getApiTokenAuthentication } from '../modules/api-token/api-token.auth';

export const requestContextMiddleware = function (
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // An API token wins over a session cookie sent with it: the request runs as the token's user
  const user = getApiTokenAuthentication(req)?.user ?? req.session.user;
  requestContext.run(
    {
      user,
      correlationId: uuidv4(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      referer: req.headers.referer,
      organizationId: user?.selected_organization_id,
    },
    () => {
      next();
    }
  );
};
