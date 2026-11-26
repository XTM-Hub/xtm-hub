import { isValueInEnum } from '@/utils/is-value-in-enum';
import {
  AdminRegisteredPlatformOrdering,
  type AdminRegisteredPlatformRowFragment,
  type AdminRegisteredPlatformsFilter,
  type AdminRegisteredPlatformsQuery,
  type AdminRegisteredPlatformsQueryVariables,
  OrderingMode,
  PlatformConfigurationStatus,
  PlatformIdentifier,
  RegisteredPlatformCredentialKind,
} from '@graphql/generated';

// The API clamps the page size to 100. The client computes the cursor of a page from its own page size (page size x
// page index): asking for more than 100 would make the next page start past rows the API never returned.
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

// The index of the last page that holds a platform, 0 when there is none.
export const getLastPageIndex = (
  totalCount: number,
  pageSize: number
): number => Math.max(Math.ceil(totalCount / pageSize) - 1, 0);

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

export const CREDENTIAL_KIND_LABEL_BY_CREDENTIAL_KIND: Record<
  RegisteredPlatformCredentialKind,
  string
> = {
  [RegisteredPlatformCredentialKind.Token]:
    'AdminRegisteredPlatforms.Credential.Kind.token',
  [RegisteredPlatformCredentialKind.None]:
    'AdminRegisteredPlatforms.Credential.Kind.none',
};

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
