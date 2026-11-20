import express from 'express';
import { PlatformConfigurationStatus } from '../../../__generated__/resolvers-types';
import type DeploymentRequest from '../../../model/kanel/public/DeploymentRequest';
import { logApp } from '../../../utils/app-logger.util';
import { DeploymentRequestDomain } from '../../deployment/deployment.domain';
import { PlatformConfigurationDomain } from '../../registration/platform-configuration/platform-configuration.domain';

export const PLATFORM_TOKEN_HEADER = 'xtm-hub-platform-token';
export const PLATFORM_ID_HEADER = 'xtm-hub-platform-id';

export const extractPlatformToken = (req: express.Request): string | null => {
  return (req?.headers?.[PLATFORM_TOKEN_HEADER] as string) || null;
};

export const extractPlatformId = (req: express.Request): string | null => {
  return (req?.headers?.[PLATFORM_ID_HEADER] as string) || null;
};

export const validateExistsPlatformAndToken = (
  req: express.Request
): { token: string; platform_id: string } | null => {
  const token = extractPlatformToken(req);
  if (!token) {
    logApp.warn('[validatePlatformToken] Missing platformToken header');
    return null;
  }

  const platform_id = extractPlatformId(req);
  if (!platform_id) {
    logApp.warn('[validatePlatformToken] Missing platformId header');
    return null;
  }
  return { token, platform_id };
};

export const validateActivePlatformToken = async (
  req: express.Request
): Promise<boolean> => {
  const extractedAuth = validateExistsPlatformAndToken(req);
  if (!extractedAuth) return false;

  const { platform_id, token } = extractedAuth;

  const platformConfiguration =
    await PlatformConfigurationDomain.loadConfigurationByPlatformAndToken({
      platform_id,
      token,
    });

  return platformConfiguration?.status === PlatformConfigurationStatus.Active;
};

export const validateAndGetRequestedPlatformToken = async ({
  platform_id,
  token,
}: {
  platform_id: string;
  token: string;
}): Promise<DeploymentRequest | undefined> => {
  const deploymentRequest =
    await DeploymentRequestDomain.loadDeploymentRequestBy({
      platform_token: token,
    });

  const isValid =
    deploymentRequest &&
    deploymentRequest.platform_id !== null &&
    deploymentRequest.platform_id === platform_id;
  if (!isValid) {
    logApp.warn(
      '[validatePlatformToken] No registration matching token, or invalid platformId provided'
    );
  }

  return isValid ? deploymentRequest : undefined;
};
