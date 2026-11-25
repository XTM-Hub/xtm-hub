import { ApiTokenRowFragment, ApiTokenScope } from '@graphql/generated';

export type ApiTokenStatus = 'active' | 'expired' | 'revoked';

/** Revoked wins over expired: a revoked token stays revoked whatever its date. */
export const getApiTokenStatus = (
  token: Pick<ApiTokenRowFragment, 'expires_at' | 'revoked_at'>,
  now: Date = new Date()
): ApiTokenStatus => {
  if (token.revoked_at) {
    return 'revoked';
  }
  return new Date(token.expires_at).getTime() <= now.getTime()
    ? 'expired'
    : 'active';
};

export const UNKNOWN_SERVER_ERROR_KEY = 'Error.Server.UNKNOWN_ERROR';

/**
 * The catalog key of a server error, or the generic unknown-error line when
 * the catalog has no entry for its message, so a raw key is never shown.
 */
export const getServerErrorKey = (
  error: unknown,
  has: (key: string) => boolean
): string => {
  const key = `Error.Server.${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`;
  return has(key) ? key : UNKNOWN_SERVER_ERROR_KEY;
};

/** The lifetimes offered at creation; the API refuses more than 366 days. */
export const API_TOKEN_LIFETIME_DAYS = ['7', '30', '90', '180', '365'] as const;
export type ApiTokenLifetimeDays = (typeof API_TOKEN_LIFETIME_DAYS)[number];
export const DEFAULT_API_TOKEN_LIFETIME_DAYS: ApiTokenLifetimeDays = '90';

const DAY_MS = 24 * 60 * 60 * 1000;

export const getApiTokenExpiry = (
  days: ApiTokenLifetimeDays,
  now: Date = new Date()
): Date => new Date(now.getTime() + Number(days) * DAY_MS);

/** Least privilege first: the order the scope field offers them in. */
export const API_TOKEN_SCOPES = [
  ApiTokenScope.Read,
  ApiTokenScope.ReadWrite,
  ApiTokenScope.Admin,
] as const;

/** Active tokens first, newest first inside each status. */
export const sortApiTokens = (
  tokens: readonly ApiTokenRowFragment[],
  now: Date = new Date()
): ApiTokenRowFragment[] => {
  const rank: Record<ApiTokenStatus, number> = {
    active: 0,
    expired: 1,
    revoked: 2,
  };
  return [...tokens].sort(
    (a, b) =>
      rank[getApiTokenStatus(a, now)] - rank[getApiTokenStatus(b, now)] ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

/** The value of a toolbar filter that keeps every token. */
export const API_TOKEN_FILTER_ALL = 'all';

export interface ApiTokenFilters {
  search: string;
  organizationId: string;
  scope: string;
  status: string;
}

export const DEFAULT_API_TOKEN_FILTERS: ApiTokenFilters = {
  search: '',
  organizationId: API_TOKEN_FILTER_ALL,
  scope: API_TOKEN_FILTER_ALL,
  status: API_TOKEN_FILTER_ALL,
};

/** Search on name and prefix (case-insensitive), then the three filters. */
export const filterApiTokens = (
  tokens: readonly ApiTokenRowFragment[],
  filters: ApiTokenFilters,
  now: Date = new Date()
): ApiTokenRowFragment[] => {
  const term = filters.search.trim().toLowerCase();
  return tokens.filter(
    (token) =>
      (!term ||
        token.name.toLowerCase().includes(term) ||
        token.token_prefix.toLowerCase().includes(term)) &&
      (filters.organizationId === API_TOKEN_FILTER_ALL ||
        token.organization_id === filters.organizationId) &&
      (filters.scope === API_TOKEN_FILTER_ALL ||
        token.scope === filters.scope) &&
      (filters.status === API_TOKEN_FILTER_ALL ||
        getApiTokenStatus(token, now) === filters.status)
  );
};

/** The organizations the tokens belong to, once each, by name. */
export const getApiTokenOrganizations = (
  tokens: readonly ApiTokenRowFragment[]
): { id: string; name: string }[] => {
  const byId = new Map<string, string>();
  tokens.forEach((token) =>
    byId.set(token.organization_id, token.organization_name)
  );
  return [...byId]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
