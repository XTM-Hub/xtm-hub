import express from 'express';
import { GraphQLFieldResolver } from 'graphql';
import { requestContext } from '../../../context/request.context';
import { PortalContext } from '../../../model/portal-context';
import { validateExistsPlatformAndToken } from '../../../modules/security-management/token/platform-token.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { ForbiddenAccess } from '../../../utils/error/error.util';
import { buildPlatformUser } from '../../machine-user';
import { loadPlatformCredentialMatch } from '../../platform-credential';

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

const loadOrganizationFromPlatformIdAndTokenHeaders = async (
  req: express.Request
) => {
  const extractedAuth = validateExistsPlatformAndToken(req);
  if (!extractedAuth) {
    throw buildInvalidPlatformTokenError();
  }

  const match = await loadPlatformCredentialMatch(extractedAuth);
  if (!match) {
    throw buildInvalidPlatformTokenError();
  }
  return match.organization;
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

export const createPlatformTokenResolver = (
  originalResolve: ResolverFn
): ResolverFn => {
  return async function secureResolver(source, args, portalContext, info) {
    const organization = await loadOrganizationFromPlatformIdAndTokenHeaders(
      portalContext.req
    );
    const platformUser = buildPlatformUser(organization);

    // If token is valid, override context with system user
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
