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
