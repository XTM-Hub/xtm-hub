import express from 'express';
import { GraphQLFieldResolver } from 'graphql';
import { v4 as uuidv4 } from 'uuid';
import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { PortalContext } from '../../../model/portal-context';
import { UserLoadUserBy } from '../../../model/user';
import { OrganizationDomain } from '../../../modules/organization-management/organization/organization.domain';
import { PlatformConfigurationDomain } from '../../../modules/registration/platform-configuration/platform-configuration.domain';
import {
  validateAndGetRequestedPlatformToken,
  validateExistsPlatformAndToken,
} from '../../../modules/security-management/token/platform-token.util';
import { PLATFORM_USER_EMAIL, PLATFORM_USER_UUID } from '../../../portal.const';
import { ErrorCode } from '../../../utils/error/error.code';

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

const loadOrganizationFromPlatformIdAndTokenHeaders = async (
  req: express.Request
) => {
  const extractedAuth = validateExistsPlatformAndToken(req);
  if (!extractedAuth) {
    throw new Error('Invalid platform token provided');
  }
  const { token, platform_id } = extractedAuth;

  const platformConfiguration =
    await PlatformConfigurationDomain.loadConfigurationByPlatformAndToken({
      platform_id,
      token,
    });
  if (platformConfiguration) {
    const organization =
      await OrganizationDomain.loadOrganizationSubscribedToServiceInstance(
        platformConfiguration.service_instance_id
      );
    if (organization) {
      return organization;
    }
  }

  const deploymentRequest = await validateAndGetRequestedPlatformToken({
    platform_id,
    token,
  });
  if (deploymentRequest) {
    return OrganizationDomain.loadOrganizationBy({
      id: deploymentRequest.organization_requester_id,
    });
  }

  throw new Error('Invalid token provided');
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
    if (!organization) {
      throw ErrorCode.OrganizationNotFound;
    }

    const platformUser: UserLoadUserBy = {
      id: PLATFORM_USER_UUID,
      email: PLATFORM_USER_EMAIL,
      salt: '',
      password: '',
      first_name: null,
      last_name: null,
      selected_organization_id: organization.id,
      picture: null,
      disabled: false,
      last_login: null,
      country: null,
      platform_token: null,
      picture_minio: null,
      selected_language: 'en',
      status: null,
      invitation_date: null,
      organizations: [organization],
      capabilities: [],
      roles_portal: [],
      organization_capabilities: [
        {
          id: uuidv4(),
          organization: organization,
          capabilities: [OrganizationCapability.ManagePlatformRegistration],
        },
      ],
      selected_org_capabilities: [
        OrganizationCapability.ManagePlatformRegistration,
      ],
    };

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
