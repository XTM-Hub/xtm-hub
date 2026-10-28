import {
  PlatformMetadata,
  PlatformMetadataMapping,
  ServiceDefinitionIdentifierToPlatformIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { slaStatus } from '@/components/service/registration/sla-availability-chart.utils';
import { daysUntil } from '@/utils/date';
import { APP_PATH } from '@/utils/path/constant';
import {
  PlatformIdentifier,
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

// Above this share of its capacity, a storage is highlighted: it needs room soon.
const STORAGE_USAGE_HIGH_PERCENT = 80;

export const isStorageUsageHigh = (percent: number): boolean =>
  percent > STORAGE_USAGE_HIGH_PERCENT;

// The availability the contract commits to, as a ratio, as the backend's SAAS_PLATFORM_SLA_TARGET.
const SAAS_PLATFORM_SLA_TARGET = 0.9998;

// The SaaS Manager sends the availability of the list as a percentage (100 is 100 %).
export const isSlaMissed = (availabilityPercent: number): boolean =>
  slaStatus(availabilityPercent / 100, SAAS_PLATFORM_SLA_TARGET) === 'Missed';

// Under this many days left, the end of the contract is highlighted: its renewal is due.
const CONTRACT_ENDING_SOON_DAYS = 90;

export const getContractEndStatus = (
  endDate: Date | string
): { daysLeft: number; isEndingSoon: boolean } => {
  // A contract already over has no day left.
  const daysLeft = Math.max(daysUntil(new Date(endDate)), 0);
  return { daysLeft, isEndingSoon: daysLeft < CONTRACT_ENDING_SOON_DAYS };
};

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
}): string => `/${APP_PATH}/service/${identifier}/${service_instance_id}`;
