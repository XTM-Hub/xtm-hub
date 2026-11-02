import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  OrderingMode,
  type OrganizationItemFragment,
  OrganizationOrdering,
  useOrganizationsListQuery,
} from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { useMemo } from 'react';

interface UseOrganizationsParams {
  searchTerm?: string;
  count?: number;
  cursor?: string;
  orderBy?: OrganizationOrdering;
  orderMode?: OrderingMode;
}

export const useOrganizations = ({
  searchTerm = '',
  count = 50,
  cursor,
  orderBy = OrganizationOrdering.Name,
  orderMode = OrderingMode.Asc,
}: UseOrganizationsParams = {}) => {
  // Keeps the previous result while other variables load: isPlaceholderData flags it as stale.
  const { data, isLoading, isError, isPlaceholderData } =
    useOrganizationsListQuery(
      portalGraphqlClient,
      { searchTerm, count, cursor: cursor ?? null, orderBy, orderMode },
      { placeholderData: keepPreviousData }
    );

  const organizations = useMemo<OrganizationItemFragment[]>(
    () => (data?.organizations.edges ?? []).map(({ node }) => node),
    [data]
  );

  return {
    organizations,
    totalCount: data?.organizations.totalCount ?? 0,
    isLoading,
    isError,
    isPlaceholderData,
  };
};

interface SubscribedOrganizationRef {
  readonly organization?: { readonly id: string } | null;
}

/**
 * Returns the list of organizations that are not yet subscribed to the service.
 * When editing an existing subscription, the subscribed organization of that subscription
 * is excluded from filtering so it remains selectable.
 */
export const useUnsubscribedOrganizations = (
  organizations: OrganizationItemFragment[],
  subscriptions: ReadonlyArray<SubscribedOrganizationRef>,
  subscriptionToEdit?: SubscribedOrganizationRef
): OrganizationItemFragment[] => {
  return useMemo(() => {
    const subscribedOrganizationIds = new Set(
      subscriptions
        .map((subscription) => subscription.organization?.id)
        .filter((id): id is string => Boolean(id))
    );

    if (subscriptionToEdit?.organization?.id) {
      subscribedOrganizationIds.delete(subscriptionToEdit.organization.id);
    }

    return organizations.filter(({ id }) => !subscribedOrganizationIds.has(id));
  }, [organizations, subscriptions, subscriptionToEdit]);
};
