import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextRegistererUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../tests/tests.const';
import {
  PortalCapability,
  ServiceRestriction,
} from '../__generated__/resolvers-types';
import { requestContext } from '../context/request.context';
import { OrganizationId } from '../model/kanel/public/Organization';
import { ForbiddenErrorCode } from '../utils/error/error.code';
import {
  RequiresOrgMembership,
  RequiresPortalCapability,
  RequiresRule,
  RequiresServiceCapability,
} from './app-guard.decorator';
import * as serviceCapabilityValidator from './directive-graphql/validator/service-capability.validator';
import { securityGuard } from './guard';

describe('app guard decorators', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    requestContext.set(undefined);
  });

  describe('requiresPortalCapability', () => {
    class Sample {
      @RequiresPortalCapability([PortalCapability.ManageDeployment])
      async run(): Promise<string> {
        return 'ok';
      }
    }

    it('should call through when the user has the required capability', async () => {
      requestContext.set({ user: contextBypassUser.user });

      await expect(new Sample().run()).resolves.toBe('ok');
    });

    it('should reject with a 403 when the user lacks the required capability', async () => {
      requestContext.set({ user: contextRegistererUserSecondOrga.user });

      const call = new Sample().run();

      await expect(call).rejects.toThrow(
        ForbiddenErrorCode.MissingCapabilityOnOrganization
      );
      await expect(call.catch((error) => error)).resolves.toMatchObject({
        data: { http_status: 403 },
      });
    });

    it('should reject with a 401 when there is no authenticated user', async () => {
      requestContext.set({});

      const call = new Sample().run();

      await expect(call.catch((error) => error)).resolves.toMatchObject({
        data: { http_status: 401 },
      });
    });
  });

  describe('requiresOrgMembership', () => {
    const organizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION
      .ID as OrganizationId;

    class Sample {
      @RequiresOrgMembership((id: OrganizationId) => id)
      async run(_id: OrganizationId): Promise<string> {
        return 'ok';
      }
    }

    it('should call through when the user belongs to the organization', async () => {
      vi.spyOn(securityGuard, 'assertUserIsInOrganization').mockResolvedValue(
        undefined
      );
      requestContext.set({ user: contextRegistererUserSecondOrga.user });

      await expect(new Sample().run(organizationId)).resolves.toBe('ok');
    });

    it('should propagate the plain Error thrown when the user does not belong', async () => {
      // assertUserIsInOrganization throws a plain Error, not a
      // CustomApolloError — the decorator must not swallow or reshape it,
      // since sendAppError/mapToGraphQLError are what translate it downstream.
      vi.spyOn(securityGuard, 'assertUserIsInOrganization').mockRejectedValue(
        new Error(ForbiddenErrorCode.UserIsNotInOrganization)
      );
      requestContext.set({ user: contextRegistererUserSecondOrga.user });

      await expect(new Sample().run(organizationId)).rejects.toThrow(
        ForbiddenErrorCode.UserIsNotInOrganization
      );
    });

    it('should reject with a 401 when there is no authenticated user', async () => {
      requestContext.set({});

      const call = new Sample().run(organizationId);

      await expect(call.catch((error) => error)).resolves.toMatchObject({
        data: { http_status: 401 },
      });
    });
  });

  describe('requiresServiceCapability', () => {
    class Sample {
      @RequiresServiceCapability(
        [ServiceRestriction.Access],
        (serviceInstanceId: string) => ({
          service_instance_id: serviceInstanceId,
        })
      )
      async run(_serviceInstanceId: string): Promise<string> {
        return 'ok';
      }
    }

    it('should call through when hasServiceCapability resolves true', async () => {
      vi.spyOn(
        serviceCapabilityValidator,
        'hasServiceCapability'
      ).mockResolvedValue(true);
      requestContext.set({ user: contextRegistererUserSecondOrga.user });

      await expect(new Sample().run('service-1')).resolves.toBe('ok');
    });

    it('should reject with the mapped ForbiddenErrorCode and a 403 when denied', async () => {
      vi.spyOn(
        serviceCapabilityValidator,
        'hasServiceCapability'
      ).mockResolvedValue(false);
      requestContext.set({ user: contextRegistererUserSecondOrga.user });

      const call = new Sample().run('service-1');

      await expect(call).rejects.toThrow(
        ForbiddenErrorCode.MissingCapabilityOnService
      );
      await expect(call.catch((error) => error)).resolves.toMatchObject({
        data: { http_status: 403 },
      });
    });
  });

  describe('requiresRule', () => {
    class Sample {
      @RequiresRule(
        (user, id: string) => user.id === id,
        ForbiddenErrorCode.CantDeleteYourself
      )
      async run(_id: string): Promise<string> {
        return 'ok';
      }
    }

    class AsyncPredicateSample {
      @RequiresRule(
        (user, id: string) => Promise.resolve(user.id === id),
        ForbiddenErrorCode.CantDeleteYourself
      )
      async run(_id: string): Promise<string> {
        return 'ok';
      }
    }

    it('should call through when the predicate resolves truthy', async () => {
      requestContext.set({ user: contextRegistererUserSecondOrga.user });

      await expect(
        new Sample().run(contextRegistererUserSecondOrga.user.id)
      ).resolves.toBe('ok');
    });

    it('should support an async predicate', async () => {
      requestContext.set({ user: contextRegistererUserSecondOrga.user });

      await expect(
        new AsyncPredicateSample().run(contextRegistererUserSecondOrga.user.id)
      ).resolves.toBe('ok');
    });

    it('should reject with the supplied ForbiddenErrorCode and a 403 when the predicate is false', async () => {
      requestContext.set({ user: contextRegistererUserSecondOrga.user });

      const call = new Sample().run('someone-else');

      await expect(call).rejects.toThrow(ForbiddenErrorCode.CantDeleteYourself);
      await expect(call.catch((error) => error)).resolves.toMatchObject({
        data: { http_status: 403 },
      });
    });
  });
});
