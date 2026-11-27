import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { ServiceInstanceDomain } from '../../../modules/service/instance/service-instance.domain';
import { NotFoundErrorCode } from '../../../utils/error/error.code';
import { allow, deny, forCaller, Guard, TargetedGuard } from '../guard.types';
import { buildPrincipal, Principal } from '../principal';
import { Source } from '../sources';
import {
  denyUnlessSelectedOrganizationMember,
  withWellFormedServiceInstanceId,
} from './service.guard';

// Hands nothing, so a guard that can answer through it takes no `.targets()`
export const publicServiceInstance = <Args = unknown>({
  serviceInstance,
}: {
  serviceInstance: Source<Args, ServiceInstanceId, Principal>;
}): Guard<Args> => ({
  // Not `forCaller`, which refuses an anonymous caller. The same builder, so it combines with the user guards
  principalFrom: buildPrincipal,
  check: (principal, args) =>
    withWellFormedServiceInstanceId(
      serviceInstance(principal, args),
      async (serviceInstanceId) =>
        (await ServiceInstanceDomain.isServiceInstancePublic(serviceInstanceId))
          ? allow()
          : deny(NotFoundErrorCode.NotFound)
    ),
});

// The selected organization subscribes to the instance: no capability, so any member of it passes
export const subscribedGuard = <Args = unknown>({
  serviceInstance,
}: {
  serviceInstance: Source<Args, ServiceInstanceId>;
}): TargetedGuard<Args> =>
  forCaller<'user', Args>('user', async (user, args) => {
    if (user.isBypassUser) {
      return allow({ kind: 'admin' });
    }
    return (
      denyUnlessSelectedOrganizationMember(user) ??
      withWellFormedServiceInstanceId(
        serviceInstance(user, args),
        async (serviceInstanceId) =>
          (await ServiceInstanceDomain.isServiceInstanceSubscribedByOrganization(
            user.selectedOrganizationId,
            serviceInstanceId
          ))
            ? allow({
                kind: 'serviceInstance',
                serviceInstanceId,
                organizationId: user.selectedOrganizationId,
              })
            : deny(NotFoundErrorCode.NotFound)
      )
    );
  });
