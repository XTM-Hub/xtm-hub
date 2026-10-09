import {
  PlatformMetadata,
  PlatformMetadataMapping,
  ServiceDefinitionIdentifierToPlatformIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { APP_PATH } from '@/utils/path/constant';
import { ServiceDefinitionIdentifier } from '@graphql/generated';

export const getSaasPlatformMetadata = (
  identifier: ServiceDefinitionIdentifier
): PlatformMetadata | undefined => {
  const platformIdentifier =
    ServiceDefinitionIdentifierToPlatformIdentifier[identifier];
  return platformIdentifier
    ? PlatformMetadataMapping[platformIdentifier]
    : undefined;
};

export const getSaasPlatformProductName = (
  identifier: ServiceDefinitionIdentifier
): string => getSaasPlatformMetadata(identifier)?.name ?? '';

export const getSaasPlatformServicePath = ({
  identifier,
  service_instance_id,
}: {
  identifier: ServiceDefinitionIdentifier;
  service_instance_id: string;
}): string => `/${APP_PATH}/service/${identifier}/${service_instance_id}`;
