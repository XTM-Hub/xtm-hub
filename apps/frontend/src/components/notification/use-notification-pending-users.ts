import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  FilterKey,
  OrderingMode,
  PendingUsersQueryVariables,
  usePendingUsersQuery,
  UserOrdering,
} from '@graphql/generated';

/**
 * The variables of the pending users shown by the bell. The bell and the
 * pending users tab counter both read them, so they share one cache entry:
 * every key is set, null included, for both to hash to the same query key.
 */
export const notificationPendingUserQueryFilters = (
  organizationId: string
): PendingUsersQueryVariables => ({
  first: 20,
  after: null,
  orderBy: UserOrdering.LastLogin,
  orderMode: OrderingMode.Asc,
  searchTerm: null,
  filters: [{ key: FilterKey.OrganizationId, value: [organizationId] }],
});

interface UseNotificationPendingUsersOptions {
  enabled?: boolean;
}

export const useNotificationPendingUsers = (
  organizationId: string,
  { enabled = true }: UseNotificationPendingUsersOptions = {}
) =>
  usePendingUsersQuery(
    portalGraphqlClient,
    notificationPendingUserQueryFilters(organizationId),
    {
      enabled,
      // Like Relay, a failed load reaches the error page; a failed background
      // refetch keeps the pending users shown.
      throwOnError: (_error, query) => query.state.data === undefined,
    }
  );
