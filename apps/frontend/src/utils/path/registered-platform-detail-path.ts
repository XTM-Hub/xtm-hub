import { APP_PATH, XTM_PLATFORM_TRIAL_PATH } from '@/utils/path/constant';
import { isBundleProduct } from '@/utils/platform';
import {
  DeploymentRequest,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';

interface RegisteredPlatformDetailPathInput {
  identifier: ServiceDefinitionIdentifier;
  deploymentRequest: Pick<DeploymentRequest, 'parent_id'> | null | undefined;
  serviceInstanceId: string | null | undefined;
}

export const registeredPlatformDetailPath = ({
  identifier,
  deploymentRequest,
  serviceInstanceId,
}: RegisteredPlatformDetailPathInput): string | undefined => {
  if (isBundleProduct(deploymentRequest)) {
    return XTM_PLATFORM_TRIAL_PATH;
  }

  return serviceInstanceId
    ? `/${APP_PATH}/service/${identifier}/${serviceInstanceId}`
    : undefined;
};
