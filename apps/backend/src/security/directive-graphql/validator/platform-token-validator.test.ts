import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import { requestContext } from '../../../context/request.context';
import DeploymentRequest from '../../../model/kanel/public/DeploymentRequest';
import Organization from '../../../model/kanel/public/Organization';
import type { PortalContext } from '../../../model/portal-context';
import type { UserLoadUserBy } from '../../../model/user';
import { DeploymentRequestDomain } from '../../../modules/deployment/deployment.domain';
import { OrganizationDomain } from '../../../modules/organization-management/organization/organization.domain';
import {
  FullPlatformConfiguration,
  PlatformConfigurationDomain,
} from '../../../modules/registration/platform-configuration/platform-configuration.domain';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../../modules/security-management/token/platform-token.util';
import {
  ErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { ErrorType } from '../../../utils/error/error.type';
import { createPlatformTokenResolver } from './platform-token-validator';

const platformId = uuidv4();
const platformToken = uuidv4();

const INVALID_PLATFORM_TOKEN_ERROR = {
  name: ErrorType.ForbiddenAccess,
  message: 'Invalid platform token provided',
  _logLevel: 'warn',
  extensions: { code: ErrorCode.InvalidPlatformToken },
};

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
  context: PortalContext,
  args: unknown = {}
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    requestContext.run({ user: {} as UserLoadUserBy }, async () => {
      try {
        resolve(await resolver({}, args, context, {}));
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

      await expect(runResolver(resolver, context)).rejects.toMatchObject(
        INVALID_PLATFORM_TOKEN_ERROR
      );
    });

    it('should throw when platform id header is missing', async () => {
      const resolver = createPlatformTokenResolver(vi.fn());
      const context = makePortalContext({
        [PLATFORM_TOKEN_HEADER]: platformToken,
      });

      await expect(runResolver(resolver, context)).rejects.toMatchObject(
        INVALID_PLATFORM_TOKEN_ERROR
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
        'loadResolvedConfigurationByPlatformAndToken'
      ).mockResolvedValue({
        platformConfiguration: { service_instance_id: serviceInstanceId },
      } as FullPlatformConfiguration);

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

    it('should throw when neither a deployment request nor a service configuration is found', async () => {
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(undefined);
      vi.spyOn(
        PlatformConfigurationDomain,
        'loadResolvedConfigurationByPlatformAndToken'
      ).mockResolvedValue(undefined);

      const resolver = createPlatformTokenResolver(vi.fn());
      const context = makePortalContext(validHeaders);

      await expect(runResolver(resolver, context)).rejects.toMatchObject(
        INVALID_PLATFORM_TOKEN_ERROR
      );
    });

    it('should only look for an active registration, so the token of an unregistered one is refused', async () => {
      // Given the loader finds no active registration for the credentials
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(undefined);
      const loadConfigurationSpy = vi
        .spyOn(
          PlatformConfigurationDomain,
          'loadResolvedConfigurationByPlatformAndToken'
        )
        .mockResolvedValue(undefined);
      const subscribedOrganizationSpy = vi.spyOn(
        OrganizationDomain,
        'loadOrganizationSubscribedToServiceInstance'
      );
      const resolverSpy = vi.fn();
      const resolver = createPlatformTokenResolver(resolverSpy);
      const context = makePortalContext(validHeaders);

      // When
      const call = runResolver(resolver, context);

      // Then
      await expect(call).rejects.toMatchObject(INVALID_PLATFORM_TOKEN_ERROR);
      expect(loadConfigurationSpy).toHaveBeenCalledExactlyOnceWith({
        platform_id: platformId,
        token: platformToken,
        activeOnly: true,
      });
      expect(subscribedOrganizationSpy).not.toHaveBeenCalled();
      expect(resolverSpy).not.toHaveBeenCalled();
    });

    it('should still accept an unregistered trial through its deployment request', async () => {
      // Given
      const orgId = uuidv4();
      vi.spyOn(
        PlatformConfigurationDomain,
        'loadResolvedConfigurationByPlatformAndToken'
      ).mockResolvedValue(undefined);
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue({
        platform_id: platformId,
        organization_requester_id: orgId,
      } as unknown as DeploymentRequest);
      vi.spyOn(OrganizationDomain, 'loadOrganizationBy').mockResolvedValue({
        id: orgId,
      } as Organization);
      const resolverSpy = vi.fn(async (_s, _a, ctx: PortalContext) => ctx.user);
      const resolver = createPlatformTokenResolver(resolverSpy);
      const context = makePortalContext(validHeaders);

      // When
      const result = await runResolver(resolver, context);

      // Then
      expect(result.selected_organization_id).toBe(orgId);
    });

    it('should throw an invalid platform token error when the deployment request organization no longer exists', async () => {
      // Given
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue({
        platform_id: platformId,
        organization_requester_id: uuidv4(),
      } as unknown as DeploymentRequest);
      vi.spyOn(OrganizationDomain, 'loadOrganizationBy').mockResolvedValue(
        undefined
      );
      const resolver = createPlatformTokenResolver(vi.fn());
      const context = makePortalContext(validHeaders);

      // When
      const call = runResolver(resolver, context);

      // Then
      await expect(call).rejects.toMatchObject(INVALID_PLATFORM_TOKEN_ERROR);
    });
  });
});

describe('createPlatformTokenResolver with a keyed registration', () => {
  const cleanups: (() => Promise<void>)[] = [];

  const givenKeyedCaller = async () => {
    const caller = await TestHelper.keyedPlatformCaller.create();
    cleanups.push(caller.cleanup);
    return caller;
  };

  const assertionContext = (assertion: string) =>
    makePortalContext(
      TestHelper.keyedPlatformCaller.assertionHeaders(assertion)
    );

  const resolveSelectedOrganization = () =>
    createPlatformTokenResolver(
      vi.fn(async (_s, _a, ctx: PortalContext) => ctx.user)
    );

  const platformAuthenticationError = (code: UnauthenticatedErrorCode) => ({
    message: code,
    extensions: { code },
  });

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
  });

  it('should run the resolver as the organization of the registration when the assertion is valid', async () => {
    // Given
    const keyed = await givenKeyedCaller();
    const context = assertionContext(await keyed.sign());

    // When
    const user = await runResolver(resolveSelectedOrganization(), context);

    // Then
    expect(user.selected_organization_id).toBe(
      TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
    );
  });

  it('should run every field of one request with its single assertion', async () => {
    // Given
    const keyed = await givenKeyedCaller();
    const context = assertionContext(await keyed.sign());
    await runResolver(resolveSelectedOrganization(), context);

    // When
    const user = await runResolver(resolveSelectedOrganization(), context);

    // Then
    expect(user.selected_organization_id).toBe(
      TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
    );
  });

  it('should refuse with PLATFORM_ASSERTION_INVALID an assertion sent a second time', async () => {
    // Given
    const keyed = await givenKeyedCaller();
    const assertion = await keyed.sign();
    await runResolver(
      resolveSelectedOrganization(),
      assertionContext(assertion)
    );
    const resolverSpy = vi.fn();

    // When
    const call = runResolver(
      createPlatformTokenResolver(resolverSpy),
      assertionContext(assertion)
    );

    // Then
    await expect(call).rejects.toMatchObject(
      platformAuthenticationError(
        UnauthenticatedErrorCode.PlatformAssertionInvalid
      )
    );
    expect(resolverSpy).not.toHaveBeenCalled();
  });

  it('should refuse with PLATFORM_ASSERTION_INVALID an assertion of another platform than the input names', async () => {
    // Given
    const keyed = await givenKeyedCaller();
    const context = assertionContext(await keyed.sign());

    // When
    const call = runResolver(resolveSelectedOrganization(), context, {
      input: { platformId: uuidv4() },
    });

    // Then
    await expect(call).rejects.toMatchObject(
      platformAuthenticationError(
        UnauthenticatedErrorCode.PlatformAssertionInvalid
      )
    );
  });

  it('should refuse with PLATFORM_TOKEN_REFUSED the token of a platform that enrolled a key', async () => {
    // Given
    const keyed = await givenKeyedCaller();
    const context = makePortalContext({
      [PLATFORM_ID_HEADER]: keyed.platformId,
      [PLATFORM_TOKEN_HEADER]: uuidv4(),
    });

    // When
    const call = runResolver(resolveSelectedOrganization(), context);

    // Then
    await expect(call).rejects.toMatchObject(
      platformAuthenticationError(UnauthenticatedErrorCode.PlatformTokenRefused)
    );
  });

  it('should still run the resolver for the token of a registration without key', async () => {
    // Given
    const platformCaller = await TestHelper.platformCaller.create();
    cleanups.push(platformCaller.cleanup);
    const context = makePortalContext(platformCaller.headers);

    // When
    const user = await runResolver(resolveSelectedOrganization(), context);

    // Then
    expect(user.selected_organization_id).toBe(platformCaller.organizationId);
  });
});
