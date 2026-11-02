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
  SaasProduct,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';

export const STORAGE_PERCENT_FORMAT = {
  style: 'percent',
  maximumFractionDigits: 0,
} as const;

// The SaaS Manager names its products by a short code, normalised by the backend.
const PRODUCT_NAME_BY_SAAS_PRODUCT: Record<SaasProduct, string> = {
  [SaasProduct.Octi]: PlatformMetadataMapping[PlatformIdentifier.Opencti].name,
  [SaasProduct.Oaev]: PlatformMetadataMapping[PlatformIdentifier.Openaev].name,
  [SaasProduct.One]: PlatformMetadataMapping[PlatformIdentifier.Xtmone].name,
};

// In the order the Hub lists its products.
export const SAAS_PRODUCTS = [
  SaasProduct.Octi,
  SaasProduct.Oaev,
  SaasProduct.One,
];

export const getSaasProductName = (product: SaasProduct): string =>
  PRODUCT_NAME_BY_SAAS_PRODUCT[product];

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
