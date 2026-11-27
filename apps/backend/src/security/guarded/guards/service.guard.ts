import { ServiceRestriction } from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { AuthHelper } from '../../../modules/security-management/capability/auth.helper';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../../utils/error/error.code';
import { isUuid } from '../../../utils/uuid.util';
import {
  allow,
  CallerOf,
  deny,
  forCaller,
  GuardResult,
  TargetedGuard,
} from '../guard.types';
import { Source } from '../sources';

// The subscription or the access row stays when a member leaves the organization, so the membership is checked apart
// from it
export const denyUnlessSelectedOrganizationMember = (
  user: CallerOf<'user'>
): GuardResult | undefined =>
  user.memberships.some(
    ({ organization }) => organization.id === user.selectedOrganizationId
  )
    ? undefined
    : deny(NotFoundErrorCode.NotFound);

// A malformed id would reach the query as a Postgres error
export const withWellFormedServiceInstanceId = (
  serviceInstanceId: ServiceInstanceId | undefined,
  check: (
    serviceInstanceId: ServiceInstanceId
  ) => GuardResult | Promise<GuardResult>
): GuardResult | Promise<GuardResult> =>
  serviceInstanceId && isUuid(serviceInstanceId)
    ? check(serviceInstanceId)
    : deny(NotFoundErrorCode.NotFound);

// The capabilities are held through the caller's subscription of the selected organization to the service instance
export const serviceGuard = <Args = unknown>({
  serviceInstance,
  capabilities,
}: {
  serviceInstance: Source<Args, ServiceInstanceId>;
  capabilities: readonly [ServiceRestriction, ...ServiceRestriction[]];
}): TargetedGuard<Args> =>
  forCaller<'user', Args>('user', async (user, args) => {
    if (user.isBypassUser) {
      return allow({ kind: 'admin' });
    }
    return (
      denyUnlessSelectedOrganizationMember(user) ??
      withWellFormedServiceInstanceId(
        serviceInstance(user, args),
        async (serviceInstanceId) => {
          const access = await AuthHelper.loadCapabilitiesByServiceId(
            {
              id: user.actorId,
              selected_organization_id: user.selectedOrganizationId,
            },
            serviceInstanceId
          );
          if (!access?.is_member) {
            return deny(NotFoundErrorCode.NotFound);
          }
          const held = access.capabilities ?? [];
          return capabilities.some((capability) => held.includes(capability))
            ? allow({
                kind: 'serviceInstance',
                serviceInstanceId,
                organizationId: user.selectedOrganizationId,
              })
            : deny(ForbiddenErrorCode.MissingCapabilityOnService);
        }
      )
    );
  });
