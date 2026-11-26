import {
  OrganizationCapability,
  ServiceRestriction,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { anyOf } from '../../security/guarded/guards/combinators';
import {
  orgGuard,
  selectedOrganization,
} from '../../security/guarded/guards/organization.guard';
import { serviceGuard } from '../../security/guarded/guards/service.guard';
import { fromArg } from '../../security/guarded/sources';

type ServiceInstanceArgs = { service_instance_id: ServiceInstanceId };

// An organization manager of the selected organization, or a manager of the access to the service instance
export const manageUserServices = <Args extends ServiceInstanceArgs>() =>
  anyOf<Args>(
    orgGuard<Args>({
      organization: selectedOrganization,
      capabilities: [OrganizationCapability.ManageSubscription],
    }),
    serviceGuard<Args>({
      serviceInstance: fromArg('service_instance_id'),
      capabilities: [ServiceRestriction.ManageAccess],
    })
  );
