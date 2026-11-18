import {
  CONTRACT_LABEL_BY_CONTRACT,
  PlatformMetadataMapping,
} from '@/components/registration/PlatformIdentifierMapping';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import {
  AdminRegisteredPlatformOrdering,
  type AdminRegisteredPlatformRowFragment,
  type AdminRegisteredPlatformsFilter,
  type AdminRegisteredPlatformsQuery,
  type AdminRegisteredPlatformsQueryVariables,
  CommercialModel,
  OrderingMode,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatformCredentialKind,
} from '@graphql/generated';

// The API serves at most this many platforms a page: a larger page size would skip rows between two pages.
export const ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE = 100;

export const ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_BY =
  AdminRegisteredPlatformOrdering.LastConnectivityCheck;
export const ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_MODE = OrderingMode.Desc;

// The value of a select filter that keeps every platform.
export const ALL_FILTER_VALUE = 'all';

export interface AdminRegisteredPlatformsFilters {
  identifier: PlatformIdentifier | null;
  status: PlatformConfigurationStatus | null;
  organizationId: string | null;
  searchTerm: string | null;
}

export const EMPTY_ADMIN_REGISTERED_PLATFORMS_FILTERS: AdminRegisteredPlatformsFilters =
  {
    identifier: null,
    status: null,
    organizationId: null,
    searchTerm: null,
  };

export const normalizeAdminRegisteredPlatformsPageSize = (
  pageSize: number
): number => Math.min(pageSize, ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE);

// null when no filter is set, so the query keeps the same variables as an unfiltered list.
export const toAdminRegisteredPlatformsFilter = ({
  identifier,
  status,
  organizationId,
}: AdminRegisteredPlatformsFilters): AdminRegisteredPlatformsFilter | null => {
  if (identifier === null && status === null && organizationId === null) {
    return null;
  }
  return { identifier, status, organizationId };
};

export const buildAdminRegisteredPlatformsVariables = ({
  filters,
  pageSize,
  cursor,
  orderBy,
  orderMode,
}: {
  filters: AdminRegisteredPlatformsFilters;
  pageSize: number;
  cursor: string | null;
  orderBy: AdminRegisteredPlatformOrdering;
  orderMode: OrderingMode;
}): AdminRegisteredPlatformsQueryVariables => ({
  first: normalizeAdminRegisteredPlatformsPageSize(pageSize),
  after: cursor,
  orderBy,
  orderMode,
  searchTerm: filters.searchTerm?.trim() || null,
  filter: toAdminRegisteredPlatformsFilter(filters),
});

// Every other value, ALL_FILTER_VALUE among them, keeps the platforms of every product.
export const parseIdentifierFilterValue = (
  value: string
): PlatformIdentifier | null =>
  isValueInEnum(value, PlatformIdentifier) ? value : null;

export const parseStatusFilterValue = (
  value: string
): PlatformConfigurationStatus | null =>
  isValueInEnum(value, PlatformConfigurationStatus) ? value : null;

// The URL is sent by the platform itself: only a web address is made a link, never a javascript: or data: one.
export const isHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

// Brand names are never translated.
export const getPlatformProductName = (identifier: string): string =>
  isValueInEnum(identifier, PlatformIdentifier)
    ? PlatformMetadataMapping[identifier].name
    : identifier;

const CREDENTIAL_KIND_LABEL_KEYS: Partial<Record<string, string>> = {
  [RegisteredPlatformCredentialKind.Token]:
    'AdminRegisteredPlatforms.Credential.Kind.token',
  [RegisteredPlatformCredentialKind.None]:
    'AdminRegisteredPlatforms.Credential.Kind.none',
};

// More credential kinds are expected: a kind this client does not know yet has no label key, and is shown as is.
export const getCredentialKindLabelKey = (kind: string): string | undefined =>
  CREDENTIAL_KIND_LABEL_KEYS[kind];

export const getContractLabelKey = (contract: string): string | undefined =>
  isValueInEnum(contract, PlatformContract)
    ? CONTRACT_LABEL_BY_CONTRACT[contract]
    : undefined;

const COMMERCIAL_MODEL_LABEL_KEYS: Partial<Record<string, string>> = {
  [CommercialModel.Saas]: 'AdminRegisteredPlatforms.CommercialModel.SAAS',
  [CommercialModel.Other]: 'AdminRegisteredPlatforms.CommercialModel.OTHER',
};

export const getCommercialModelLabelKey = (
  commercialModel: string
): string | undefined => COMMERCIAL_MODEL_LABEL_KEYS[commercialModel];

const STATUS_LABEL_KEYS: Partial<Record<string, string>> = {
  [PlatformConfigurationStatus.Active]:
    'AdminRegisteredPlatforms.Status.active',
  [PlatformConfigurationStatus.Inactive]:
    'AdminRegisteredPlatforms.Status.inactive',
};

export const getStatusLabelKey = (status: string): string | undefined =>
  STATUS_LABEL_KEYS[status];

export const getRegistererName = (
  registerer: AdminRegisteredPlatformRowFragment['registerer']
): string | null => {
  const name = [registerer?.first_name, registerer?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || null;
};

type UnregistrablePlatform<
  T extends Pick<AdminRegisteredPlatformRowFragment, 'status' | 'organization'>,
> = T & {
  organization: NonNullable<AdminRegisteredPlatformRowFragment['organization']>;
};

// Only an active registration can be unregistered, and the API needs its organization to email the administrators.
export const canUnregisterPlatform = <
  T extends Pick<AdminRegisteredPlatformRowFragment, 'status' | 'organization'>,
>(
  platform: T
): platform is UnregistrablePlatform<T> =>
  platform.status === PlatformConfigurationStatus.Active &&
  platform.organization !== null;

// The table identifies its rows by an id: a registration is identified by its service instance.
export type AdminRegisteredPlatformRow = AdminRegisteredPlatformRowFragment & {
  id: string;
};

export const toAdminRegisteredPlatformRows = (
  data: AdminRegisteredPlatformsQuery | undefined
): AdminRegisteredPlatformRow[] =>
  (data?.adminRegisteredPlatforms.edges ?? []).map(({ node }) => ({
    ...node,
    id: node.service_instance_id,
  }));
