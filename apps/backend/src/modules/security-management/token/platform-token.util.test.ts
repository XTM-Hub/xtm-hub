import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { PlatformConfigurationStatus } from '../../../__generated__/resolvers-types';
import DeploymentRequest from '../../../model/kanel/public/DeploymentRequest';
import PlatformConfiguration from '../../../model/kanel/public/PlatformConfiguration';
import { DeploymentRequestDomain } from '../../../modules/deployment/deployment.domain';
import { PlatformConfigurationDomain } from '../../registration/platform-configuration/platform-configuration.domain';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
  validateActivePlatformToken,
  validateAndGetRequestedPlatformToken,
} from './platform-token.util';

describe('platform Token Validation', () => {
  describe('validateActivePlatformToken', () => {
    it('should return false when platform token header is missing', async () => {
      const req: express.Request = {
        headers: {},
      } as unknown as express.Request;

      const result = await validateActivePlatformToken(req);

      expect(result).toBe(false);
    });

    it('should return false when platform id header is missing', async () => {
      const req: express.Request = {
        headers: {
          [PLATFORM_TOKEN_HEADER]: 'anything',
        },
      } as unknown as express.Request;

      const result = await validateActivePlatformToken(req);

      expect(result).toBe(false);
    });
    it('should return false when headers are valid but no matching platform found', async () => {
      const platformId = uuidv4();
      const platformToken = uuidv4();
      vi.spyOn(
        PlatformConfigurationDomain,
        'loadConfigurationByPlatformAndToken'
      ).mockResolvedValue(undefined);

      const req: express.Request = {
        headers: {
          [PLATFORM_TOKEN_HEADER]: platformToken,
          [PLATFORM_ID_HEADER]: platformId,
        },
      } as unknown as express.Request;

      const result = await validateActivePlatformToken(req);

      expect(result).toBe(false);
    });
    it('should return false when platform is found but inactive', async () => {
      const platformId = uuidv4();
      const platformToken = uuidv4();
      vi.spyOn(
        PlatformConfigurationDomain,
        'loadConfigurationByPlatformAndToken'
      ).mockResolvedValue({
        platform_id: platformId,
        status: PlatformConfigurationStatus.Inactive,
      } as unknown as PlatformConfiguration);

      const req: express.Request = {
        headers: {
          [PLATFORM_TOKEN_HEADER]: platformToken,
          [PLATFORM_ID_HEADER]: platformId,
        },
      } as unknown as express.Request;

      const result = await validateActivePlatformToken(req);

      expect(result).toBe(false);
    });
    it('should return true when valid header for registered platform are provided', async () => {
      const platformId = uuidv4();
      const platformToken = uuidv4();
      vi.spyOn(
        PlatformConfigurationDomain,
        'loadConfigurationByPlatformAndToken'
      ).mockResolvedValue({
        platform_id: platformId,
        status: PlatformConfigurationStatus.Active,
      } as unknown as PlatformConfiguration);

      const req: express.Request = {
        headers: {
          [PLATFORM_TOKEN_HEADER]: platformToken,
          [PLATFORM_ID_HEADER]: platformId,
        },
      } as unknown as express.Request;

      const result = await validateActivePlatformToken(req);

      expect(result).toBe(true);
    });
  });
  describe('validateAndGetRequestedPlatformToken', () => {
    it('should return true when valid header for requested are provided', async () => {
      const platformId = uuidv4();
      const platformToken = uuidv4();

      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue({
        platform_id: platformId,
      } as DeploymentRequest);

      const result = await validateAndGetRequestedPlatformToken({
        platform_id: platformId,
        token: platformToken,
      });

      expect(result).toBeTruthy();
    });

    it('should return null when platform id header provided is unknown', async () => {
      const platformId = uuidv4();
      const platformToken = uuidv4();

      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(undefined);

      const result = await validateAndGetRequestedPlatformToken({
        platform_id: platformId,
        token: platformToken,
      });

      expect(result).toBe(undefined);
    });

    it('should return undefined when platform id does not match the deployment request token', async () => {
      const platformId = uuidv4();
      const platformToken = uuidv4();

      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue({
        platform_id: uuidv4(),
      } as DeploymentRequest);

      const result = await validateAndGetRequestedPlatformToken({
        platform_id: platformId,
        token: platformToken,
      });

      expect(result).toBe(undefined);
    });

    it('should return undefined when deployment request has no platform_id yet', async () => {
      const platformId = uuidv4();
      const platformToken = uuidv4();

      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue({
        platform_id: null,
      } as DeploymentRequest);

      const result = await validateAndGetRequestedPlatformToken({
        platform_id: platformId,
        token: platformToken,
      });

      expect(result).toBe(undefined);
    });
  });
});
