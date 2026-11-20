import { ServiceRestriction } from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { AuthHelper } from '../../../modules/security-management/capability/auth.helper';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../../utils/error/error.code';
import { isUuid } from '../../../utils/uuid.util';
import { allow, deny, forCaller, TargetedGuard } from '../guard.types';
import { Source } from '../sources';

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
    const serviceInstanceId = serviceInstance(user, args);
    // A malformed id would reach the query as a Postgres error
    if (!serviceInstanceId || !isUuid(serviceInstanceId)) {
      return deny(NotFoundErrorCode.NotFound);
    }
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
  });
