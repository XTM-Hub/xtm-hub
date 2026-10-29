import {
  PlatformMetadata,
  PlatformMetadataMapping,
  ServiceDefinitionIdentifierToPlatformIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { daysUntil } from '@/utils/date';
import {
  APP_PATH,
  REGISTERED_PLATFORM_ORIGIN_CSM_BOARD,
  REGISTERED_PLATFORM_ORIGIN_PARAM,
} from '@/utils/path/constant';
import {
  PlatformIdentifier,
  SaasPlatformHealthIssue,
  type SaasPlatformRowFragment,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';

// The SaaS Manager names its products by a short code, upper-cased here.
const PRODUCT_NAME_BY_SAAS_PRODUCT: Record<string, string> = {
  OCTI: PlatformMetadataMapping[PlatformIdentifier.Opencti].name,
  OAEV: PlatformMetadataMapping[PlatformIdentifier.Openaev].name,
  ONE: PlatformMetadataMapping[PlatformIdentifier.Xtmone].name,
};

// A product the Hub does not know keeps the code the SaaS Manager sent.
export const getSaasProductName = (product: string): string =>
  PRODUCT_NAME_BY_SAAS_PRODUCT[product.toUpperCase()] ?? product;

// The measure behind a health issue of a platform, as a ratio (1 is 100 %): the storages are sent as percentages.
export const getHealthIssueRatio = (
  { sla_cmtd, storage }: Pick<SaasPlatformRowFragment, 'sla_cmtd' | 'storage'>,
  issue: SaasPlatformHealthIssue
): number | null => {
  const percentToRatio = (percent: number | null | undefined) =>
    typeof percent === 'number' ? percent / 100 : null;
  switch (issue) {
    case SaasPlatformHealthIssue.Availability:
      return sla_cmtd;
    case SaasPlatformHealthIssue.Database:
      return percentToRatio(storage?.es_used_size?.percent);
    case SaasPlatformHealthIssue.FileStorage:
      return percentToRatio(storage?.s3_used_size?.percent);
  }
};

// Counted in started days, as the backend rates the contract status.
export const getContractDaysLeft = (endDate: Date | string): number =>
  daysUntil(new Date(endDate));

export const getSaasPlatformMetadata = (
  identifier: ServiceDefinitionIdentifier
): PlatformMetadata | undefined => {
  const platformIdentifier =
    ServiceDefinitionIdentifierToPlatformIdentifier[identifier];
  return platformIdentifier
    ? PlatformMetadataMapping[platformIdentifier]
    : undefined;
};

export const getSaasPlatformServicePath = ({
  identifier,
  service_instance_id,
}: {
  identifier: ServiceDefinitionIdentifier;
  service_instance_id: string;
}): string =>
  `/${APP_PATH}/service/${identifier}/${service_instance_id}?${REGISTERED_PLATFORM_ORIGIN_PARAM}=${REGISTERED_PLATFORM_ORIGIN_CSM_BOARD}`;
