import { Management, ManagementError } from 'auth0';
import { logApp } from '../../utils/app-logger.util';
import { Auth0UpdateUserRBACInstance } from './client';

export const removeEmptyGroups = (
  instance: Auth0UpdateUserRBACInstance
): Auth0UpdateUserRBACInstance => {
  const filtered: Auth0UpdateUserRBACInstance = {};

  for (const [key, value] of Object.entries(instance)) {
    if (
      value?.groups &&
      Array.isArray(value.groups) &&
      value.groups.length > 0
    ) {
      filtered[key] = value;
    }
  }

  return filtered;
};

export const buildUserMetadataUpdate = (
  auth0_user: Management.UserResponseSchema,
  userRBACInstance: Auth0UpdateUserRBACInstance
) => {
  return {
    user_metadata: {
      ...auth0_user.user_metadata,
      rbac_instance: removeEmptyGroups({
        ...((auth0_user.user_metadata
          ?.rbac_instance as Auth0UpdateUserRBACInstance) ?? {}),
        ...userRBACInstance,
      }),
    },
  };
};

const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_RATE_LIMIT_WAIT_MS = 1000;
const MAX_RATE_LIMIT_WAIT_MS = 60 * 1000;

// Auth0 search reportedly returns 503 above ~72 OR terms and 414 on long URLs: stay well below.
export const EMAILS_PER_LOOKUP = 50;
export const USERS_LIST_PAGE_SIZE = 100;

export const isRateLimitError = (error: unknown): boolean =>
  error instanceof ManagementError && error.statusCode === 429;

const getRateLimitHeader = (error: unknown, name: string): string | null =>
  error instanceof ManagementError
    ? (error.rawResponse?.headers?.get(name) ?? null)
    : null;

// x-ratelimit-reset is the epoch (seconds) at which the limit resets.
export const getRateLimitWaitMs = (
  error: unknown,
  now: number = Date.now()
): number => {
  const reset = Number(getRateLimitHeader(error, 'x-ratelimit-reset'));
  if (!Number.isFinite(reset) || reset <= 0) {
    return DEFAULT_RATE_LIMIT_WAIT_MS;
  }
  return Math.min(Math.max(reset * 1000 - now, 0), MAX_RATE_LIMIT_WAIT_MS);
};

export const withRateLimitRetry = async <T>(
  call: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms))
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw error;
      }
      const waitMs = getRateLimitWaitMs(error);
      logApp.debug('Auth0 rate limited, waiting before retry', {
        waitMs,
        attempt: attempt + 1,
      });
      await sleep(waitMs);
    }
  }
};

const escapeLuceneValue = (value: string): string =>
  value.replace(/[\\"]/g, '\\$&');

export const buildEmailsQuery = (emails: string[]): string =>
  `email:(${emails.map((email) => `"${escapeLuceneValue(email)}"`).join(' OR ')})`;

export const groupAccountsByEmail = (
  accounts: Management.UserResponseSchema[]
): Map<string, Management.UserResponseSchema[]> => {
  const byEmail = new Map<string, Management.UserResponseSchema[]>();
  for (const account of accounts) {
    if (!account.email) continue;
    const key = account.email.toLowerCase();
    const sameEmailAccounts = byEmail.get(key) ?? [];
    sameEmailAccounts.push(account);
    byEmail.set(key, sameEmailAccounts);
  }
  return byEmail;
};
