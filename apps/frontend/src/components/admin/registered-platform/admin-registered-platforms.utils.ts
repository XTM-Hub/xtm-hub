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

// Mirrors ADMIN_REGISTERED_PLATFORMS_MAX_PAGE in apps/backend/src/modules/registration/registration.app.ts, which
// clamps `first`. A page size above it would make the cursor (page size x page index) skip rows between two pages.
export const ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE = 100;
export const ADMIN_REGISTERED_PLATFORMS_DEFAULT_PAGE_SIZE = 50;

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
  first: pageSize,
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

const COMMERCIAL_MODEL_LABEL_KEY_BY_COMMERCIAL_MODEL: Record<
  CommercialModel,
  string
> = {
  [CommercialModel.Saas]: 'AdminRegisteredPlatforms.CommercialModel.SAAS',
  [CommercialModel.Other]: 'AdminRegisteredPlatforms.CommercialModel.OTHER',
};

export const getCommercialModelLabelKey = (
  commercialModel: string
): string | undefined =>
  isValueInEnum(commercialModel, CommercialModel)
    ? COMMERCIAL_MODEL_LABEL_KEY_BY_COMMERCIAL_MODEL[commercialModel]
    : undefined;

const STATUS_LABEL_KEY_BY_STATUS: Record<PlatformConfigurationStatus, string> =
  {
    [PlatformConfigurationStatus.Active]:
      'AdminRegisteredPlatforms.Status.active',
    [PlatformConfigurationStatus.Inactive]:
      'AdminRegisteredPlatforms.Status.inactive',
  };

export const getStatusLabelKey = (status: string): string | undefined =>
  isValueInEnum(status, PlatformConfigurationStatus)
    ? STATUS_LABEL_KEY_BY_STATUS[status]
    : undefined;

// A value the API sends that this client does not know yet is shown as is.
export const translateOrRaw = (
  translate: (labelKey: string) => string,
  labelKey: string | undefined,
  value: string
): string => (labelKey ? translate(labelKey) : value);

export const getRegistererName = (
  registerer: AdminRegisteredPlatformRowFragment['registerer']
): string | null => {
  const name = [registerer?.first_name, registerer?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || null;
};

// The table identifies its rows by an id: a registration is identified by its service instance.
export type AdminRegisteredPlatformRow = AdminRegisteredPlatformRowFragment & {
  id: string;
};

// Only an active registration can be unregistered, with or without an owner organization. A trial cannot be
// unregistered for now: the API flags it with is_trial and refuses it with TRIAL_PLATFORM_CANNOT_BE_UNREGISTERED.
export const canUnregisterPlatform = (
  platform: Pick<AdminRegisteredPlatformRow, 'status' | 'is_trial'>
): boolean =>
  platform.status === PlatformConfigurationStatus.Active && !platform.is_trial;

export const toAdminRegisteredPlatformRows = (
  data: AdminRegisteredPlatformsQuery | undefined
): AdminRegisteredPlatformRow[] =>
  (data?.adminRegisteredPlatforms.edges ?? []).map(({ node }) => ({
    ...node,
    id: node.service_instance_id,
  }));
