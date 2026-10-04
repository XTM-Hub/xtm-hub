import {
  ServiceDefinitionIdentifier,
  ServiceRestriction,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { UserLoadUserBy } from '../../model/user';
import { isUserGranted } from '../../security/access';
import { ErrorCode } from '../../utils/error/error.code';
import { UserServiceCapabilityHelper } from '../security-management/user-service-capability/user-service-capability.helper';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';

export const isUserRestrictedToActiveDocument = async (
  user: UserLoadUserBy,
  serviceInstanceId: ServiceInstanceId
) => {
  if (isUserGranted(user)) {
    return false;
  }

  const capabilities = await UserServiceCapabilityHelper.loadCapabilities(
    serviceInstanceId,
    user.id,
    user.selected_organization_id
  );
  const serviceDef =
    await ServiceInstanceDomain.loadServiceDefinitionByServiceInstance(
      serviceInstanceId
    );
  if (!serviceDef) {
    throw new Error(ErrorCode.ServiceDefinitionNotFound);
  }
  return (
    !capabilities?.includes(ServiceRestriction.Upload) &&
    [
      ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      ServiceDefinitionIdentifier.OpenctiCustomViews,
      ServiceDefinitionIdentifier.OpenctiHuntPacks,
      ServiceDefinitionIdentifier.OpenctiIntegrations,
    ].includes(serviceDef.identifier)
  );
};
