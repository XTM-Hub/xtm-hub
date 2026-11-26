import { requestContext } from '../../../context/request.context';
import DeploymentRequest from '../../../model/kanel/public/DeploymentRequest';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { UserId } from '../../../model/kanel/public/User';
import { ErrorCode } from '../../../utils/error/error.code';
import { OrganizationDomain } from '../../organization-management/organization/organization.domain';
import { UserOrganizationDomain } from '../../organization-management/user/user-organization/user-organization.domain';
import { AuthHelper } from '../../security-management/capability/auth.helper';
import { DeploymentRequestDomain } from '../deployment.domain';

export const ServiceGroupSecurityHelper = {
  assertOrganizationAccess: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<OrganizationId> => {
    const user = requestContext.requireUser();

    const organization =
      await OrganizationDomain.loadOrganizationSubscribedToServiceInstance(
        serviceInstanceId
      );
    if (!organization) {
      throw new Error(ErrorCode.SubscriptionNotFound);
    }
    if (
      !AuthHelper.userHasBypassCapability(user) &&
      organization.id !== user.selected_organization_id
    ) {
      throw new Error(ErrorCode.OrganizationDoesNotMatchSelectedOrganization);
    }

    return organization.id;
  },

  assertBundleAccessAndLoad: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<{
    bundleDeploymentRequest: DeploymentRequest;
    bundleOrganizationId: OrganizationId;
  }> => {
    const bundleDeploymentRequest =
      await DeploymentRequestDomain.loadDeploymentRequestBy({
        service_instance_id: serviceInstanceId,
      });
    if (!bundleDeploymentRequest) {
      throw new Error(ErrorCode.DeploymentRequestNotFound);
    }

    const bundleOrganizationId =
      await ServiceGroupSecurityHelper.assertOrganizationAccess(
        serviceInstanceId
      );

    return { bundleDeploymentRequest, bundleOrganizationId };
  },

  assertBundleAccessAndLoadChildren: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<{
    bundleDeploymentRequest: DeploymentRequest;
    bundleOrganizationId: OrganizationId;
    children: DeploymentRequest[];
  }> => {
    const { bundleDeploymentRequest, bundleOrganizationId } =
      await ServiceGroupSecurityHelper.assertBundleAccessAndLoad(
        serviceInstanceId
      );

    const children = await DeploymentRequestDomain.loadDeploymentRequestsBy({
      parent_id: bundleDeploymentRequest.id,
    });

    return { bundleDeploymentRequest, bundleOrganizationId, children };
  },

  assertUsersBelongToOrganization: async (
    userIds: UserId[],
    organizationId: OrganizationId
  ): Promise<void> => {
    const user = requestContext.requireUser();
    if (AuthHelper.userHasBypassCapability(user)) {
      return;
    }

    const allUsersInOrganization =
      await UserOrganizationDomain.areAllUsersInOrganization(
        userIds,
        organizationId
      );
    if (!allUsersInOrganization) {
      throw new Error(ErrorCode.UserIsNotInOrganization);
    }
  },
};
