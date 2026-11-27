import { GraphQLFieldResolver } from 'graphql';
import { requestContext } from '../../../context/request.context';
import { PortalContext } from '../../../model/portal-context';
import {
  authenticatePlatform,
  buildPlatformAuthenticationError,
} from '../../../modules/security-management/token/platform-authentication.util';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { ForbiddenAccess } from '../../../utils/error/error.util';
import { buildPlatformUser } from '../../machine-user';

export {
  extractPlatformId,
  extractPlatformToken,
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
  validateActivePlatformToken,
  validateAndGetRequestedPlatformToken,
  validateExistsPlatformAndToken,
} from '../../../modules/security-management/token/platform-token.util';
export const PLATFORM_TOKEN_DIRECTIVE_NAME = 'platform_token';

const buildInvalidPlatformTokenError = () => {
  const error = ForbiddenAccess(
    'Invalid platform token provided',
    undefined,
    'warn'
  );
  error.extensions = { code: ErrorCode.InvalidPlatformToken };
  return error;
};

type ResolverArgumentValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ResolverArgumentValue[]
  | { [key: string]: ResolverArgumentValue };

type ResolverFn = GraphQLFieldResolver<
  object | null,
  PortalContext,
  Record<string, ResolverArgumentValue>
>;

const readInputPlatformId = (
  args: Record<string, ResolverArgumentValue>
): string | undefined => {
  const { input } = args;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  const { platformId } = input;
  return typeof platformId === 'string' ? platformId : undefined;
};

const loadAuthenticatedPlatformOrganization = async (
  req: PortalContext['req'],
  args: Record<string, ResolverArgumentValue>
) => {
  // An unregistered (inactive) registration no longer authenticates its platform. A Hub-deployed trial still does
  // through its deployment request.
  const authentication = await authenticatePlatform(req, {
    input: { platformId: readInputPlatformId(args) },
    activeOnly: true,
  });
  switch (authentication.outcome) {
    case 'missing':
      logApp.warn('[validatePlatformToken] Missing platform credentials');
      throw buildInvalidPlatformTokenError();
    case 'refused':
      throw buildPlatformAuthenticationError(authentication.code);
    case 'authenticated':
      return authentication.match.organization;
    case 'token':
      if (!authentication.match) {
        throw buildInvalidPlatformTokenError();
      }
      return authentication.match.organization;
  }
};

export const createPlatformTokenResolver = (
  originalResolve: ResolverFn
): ResolverFn => {
  return async function secureResolver(source, args, portalContext, info) {
    const organization = await loadAuthenticatedPlatformOrganization(
      portalContext.req,
      args
    );
    const platformUser = buildPlatformUser(organization);

    // If token is valid, override context with the platform user
    const enhancedContext: PortalContext = {
      ...portalContext,
      user: platformUser,
    };
    requestContext.update({
      user: platformUser,
    });

    return originalResolve(source, args, enhancedContext, info);
  };
};
