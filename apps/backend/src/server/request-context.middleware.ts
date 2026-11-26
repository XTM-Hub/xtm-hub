import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext, requestContext } from '../context/request.context';
import { getApiTokenAuthentication } from '../modules/api-token/api-token.auth';

export const buildRequestContext = (req: Request): RequestContext => {
  const authentication = getApiTokenAuthentication(req);
  // An API token wins over a session cookie sent with it: the request runs as the token's user
  const user = authentication?.user ?? req.session.user;
  return {
    user,
    correlationId: uuidv4(),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    referer: req.headers.referer,
    organizationId: user?.selected_organization_id,
    // Kept apart from the user, which a resolver may replace: the guards and the restrictions read it to stay within
    // what the token reaches
    ...(authentication && {
      apiToken: {
        userId: authentication.user.id,
        organizationId: authentication.token.organization_id,
        organizationCapabilities: [
          ...authentication.user.selected_org_capabilities,
        ],
        portalCapabilityIds: authentication.user.capabilities.map(
          ({ id }) => id
        ),
        rolePortalIds: authentication.user.roles_portal.map(({ id }) => id),
      },
    }),
  };
};

export const requestContextMiddleware = function (
  req: Request,
  _res: Response,
  next: NextFunction
) {
  requestContext.run(buildRequestContext(req), () => {
    next();
  });
};
