import { getRegisteredPlatformServiceIdentifier } from '@/components/registration/PlatformIdentifierMapping';
import { APP_PATH } from '@/utils/path/constant';
import {
  DeploymentRequestDeploymentType,
  PlatformIdentifier,
  RegisteredPlatformsListQuery,
  ServiceDefinitionIdentifier,
  ServiceInstancesListQuery,
} from '@graphql/generated';

export interface PrivateNavigationRegisteredPlatformLink {
  serviceInstanceId: string;
  title: string;
  url?: string;
}

export const getPrivateNavigationServiceHrefs = (
  queryData: ServiceInstancesListQuery | undefined
) => {
  const serviceHrefs = new Map<ServiceDefinitionIdentifier, string>();

  for (const edge of queryData?.serviceInstances.edges ?? []) {
    const serviceInstance = edge.node;

    if (!serviceInstance) {
      continue;
    }

    const serviceIdentifier = serviceInstance.service_definition?.identifier;

    if (!serviceIdentifier || serviceHrefs.has(serviceIdentifier)) {
      continue;
    }

    serviceHrefs.set(
      serviceIdentifier,
      `/${APP_PATH}/service/${serviceIdentifier}/${serviceInstance.id}`
    );
  }

  return serviceHrefs;
};

export const getPrivateNavigationRegisteredPlatformsByIdentifier = (
  queryData: RegisteredPlatformsListQuery | undefined,
  platformIdentifier: PlatformIdentifier
): PrivateNavigationRegisteredPlatformLink[] => {
  const registeredPlatformIdentifier =
    getRegisteredPlatformServiceIdentifier(platformIdentifier);

  if (!registeredPlatformIdentifier) {
    return [];
  }

  return (queryData?.registeredPlatforms ?? []).flatMap((platform) => {
    if (!platform || platform.identifier !== registeredPlatformIdentifier) {
      return [];
    }

    if (
      platform.deployment_request?.type ===
      DeploymentRequestDeploymentType.Bundle
    ) {
      return [];
    }

    if (
      platform.deployment_request?.type ===
        DeploymentRequestDeploymentType.Trial &&
      platform.deployment_request.parent_id
    ) {
      return [];
    }

    const serviceInstanceId = platform.subscription?.service_instance?.id;

    if (!serviceInstanceId) {
      return [];
    }

    return [
      {
        serviceInstanceId,
        title: platform.title,
        url: platform.url ?? undefined,
      },
    ];
  });
};
