import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { requestContext } from '../../../context/request.context';
import DeploymentRequest from '../../../model/kanel/public/DeploymentRequest';
import Organization from '../../../model/kanel/public/Organization';
import PlatformConfiguration from '../../../model/kanel/public/PlatformConfiguration';
import type { PortalContext } from '../../../model/portal-context';
import type { UserLoadUserBy } from '../../../model/user';
import { DeploymentRequestDomain } from '../../../modules/deployment/deployment.domain';
import { OrganizationDomain } from '../../../modules/organization-management/organization/organization.domain';
import { PlatformConfigurationDomain } from '../../../modules/registration/platform-configuration/platform-configuration.domain';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../../modules/security-management/token/platform-token.util';
import { createPlatformTokenResolver } from './platform-token-validator';

const platformId = uuidv4();
const platformToken = uuidv4();

const validHeaders = {
  [PLATFORM_TOKEN_HEADER]: platformToken,
  [PLATFORM_ID_HEADER]: platformId,
};

const makePortalContext = (
  headers: Record<string, string> = {}
): PortalContext => ({
  user: {} as UserLoadUserBy,
  req: { headers, session: {} } as unknown as express.Request,
  res: {} as express.Response,
});

const runResolver = <T>(
  resolver: (
    source: unknown,
    args: unknown,
    ctx: PortalContext,
    info: unknown
  ) => Promise<T>,
  context: PortalContext
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    requestContext.run({ user: {} as UserLoadUserBy }, async () => {
      try {
        resolve(await resolver({}, {}, context, {}));
      } catch (error) {
        reject(error);
      }
    });
  });

describe('createPlatformTokenResolver', () => {
  describe('loadOrganizationFromPlatformIdAndTokenHeaders', () => {
    it('should throw when platform token header is missing', async () => {
      const resolver = createPlatformTokenResolver(vi.fn());
      const context = makePortalContext({ [PLATFORM_ID_HEADER]: platformId });

      await expect(runResolver(resolver, context)).rejects.toThrow(
        'Invalid platform token provided'
      );
    });

    it('should throw when platform id header is missing', async () => {
      const resolver = createPlatformTokenResolver(vi.fn());
      const context = makePortalContext({
        [PLATFORM_TOKEN_HEADER]: platformToken,
      });

      await expect(runResolver(resolver, context)).rejects.toThrow(
        'Invalid platform token provided'
      );
    });

    it('should load org via deployment request when a matching request is found', async () => {
      const orgId = uuidv4();
      const org = { id: orgId } as Organization;

      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue({
        platform_id: platformId,
        organization_requester_id: orgId,
      } as unknown as DeploymentRequest);

      vi.spyOn(OrganizationDomain, 'loadOrganizationBy').mockResolvedValue(org);

      const resolverSpy = vi.fn(async (_s, _a, ctx: PortalContext) => ctx.user);
      const resolver = createPlatformTokenResolver(resolverSpy);
      const context = makePortalContext(validHeaders);

      const result = await runResolver(resolver, context);

      expect(OrganizationDomain.loadOrganizationBy).toHaveBeenCalledWith({
        id: orgId,
      });
      expect(result.selected_organization_id).toBe(orgId);
    });

    it('should load org via service configuration when no deployment request matches', async () => {
      const serviceInstanceId = uuidv4();
      const orgId = uuidv4();
      const org = { id: orgId } as Organization;

      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(undefined);

      vi.spyOn(
        PlatformConfigurationDomain,
        'loadConfigurationByPlatformAndToken'
      ).mockResolvedValue({
        service_instance_id: serviceInstanceId,
      } as PlatformConfiguration);

      vi.spyOn(
        OrganizationDomain,
        'loadOrganizationSubscribedToServiceInstance'
      ).mockResolvedValue(org);

      const resolverSpy = vi.fn(async (_s, _a, ctx: PortalContext) => ctx.user);
      const resolver = createPlatformTokenResolver(resolverSpy);
      const context = makePortalContext(validHeaders);

      const result = await runResolver(resolver, context);

      expect(
        OrganizationDomain.loadOrganizationSubscribedToServiceInstance
      ).toHaveBeenCalledWith(serviceInstanceId);
      expect(result.selected_organization_id).toBe(orgId);
    });

    it.each([
      {
        description: 'the platform headers are missing',
        headers: {},
        mockLookups: () => undefined,
      },
      {
        description: 'no registration matches the headers',
        headers: validHeaders,
        mockLookups: () => {
          vi.spyOn(
            DeploymentRequestDomain,
            'loadDeploymentRequestBy'
          ).mockResolvedValue(undefined);
          vi.spyOn(
            PlatformConfigurationDomain,
            'loadConfigurationByPlatformAndToken'
          ).mockResolvedValue(undefined);
        },
      },
    ])(
      'should answer UNAUTHENTICATED when $description',
      async ({ headers, mockLookups }) => {
        // Given
        mockLookups();
        const resolver = createPlatformTokenResolver(vi.fn());
        const context = makePortalContext(headers);

        // When
        const call = runResolver(resolver, context);

        // Then
        await expect(call).rejects.toMatchObject({
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
    );

    it('should throw when neither a deployment request nor a service configuration is found', async () => {
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(undefined);
      vi.spyOn(
        PlatformConfigurationDomain,
        'loadConfigurationByPlatformAndToken'
      ).mockResolvedValue(undefined);

      const resolver = createPlatformTokenResolver(vi.fn());
      const context = makePortalContext(validHeaders);

      await expect(runResolver(resolver, context)).rejects.toThrow(
        'Invalid token provided'
      );
    });
  });
});
