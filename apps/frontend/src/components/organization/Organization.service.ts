import {
  organizationFetch,
  organizationsFragment,
} from '@/components/organization/organization.graphql';
import {
  organizationList_organizations$data,
  organizationList_organizations$key,
} from '@generated/organizationList_organizations.graphql';
import {
  OrderingMode,
  organizationSelectQuery,
} from '@generated/organizationSelectQuery.graphql';
import { subscription_fragment$data } from '@generated/subscription_fragment.graphql';
import { OrganizationOrdering } from '@graphql/generated';
import { useMemo } from 'react';
import { useLazyLoadQuery, useRefetchableFragment } from 'react-relay';

interface OrganizationParamsQuery {
  count: number;
  orderBy: OrganizationOrdering;
  orderMode: OrderingMode;
  searchTerm?: string;
}

export const getOrganizations = ({
  searchTerm = '',
  count = 50,
  orderBy = OrganizationOrdering.Name,
  orderMode = 'asc',
}: Partial<OrganizationParamsQuery> = {}) => {
  const organizationData = useLazyLoadQuery<organizationSelectQuery>(
    organizationFetch,
    {
      searchTerm,
      count,
      orderBy,
      orderMode,
    }
  );
  const [data, refetch] = useRefetchableFragment<
    organizationSelectQuery,
    organizationList_organizations$key
  >(organizationsFragment, organizationData);
  return { organizationsData: data, refetch };
};

interface AvailableOrganization {
  readonly domains: ReadonlyArray<string> | null | undefined;
  readonly id: string;
  readonly name: string;
  readonly personal_space: boolean;
}

/**
 * Returns the list of organizations that are not yet subscribed to the service.
 * When editing an existing subscription, the subscribed organization of that subscription
 * is excluded from filtering so it remains selectable.
 */
export const useUnsubscribedOrganizations = (
  organizationsData: organizationList_organizations$data,
  subscriptions: subscription_fragment$data[],
  subscriptionToEdit?: subscription_fragment$data
): AvailableOrganization[] => {
  return useMemo(() => {
    const subscribedOrganizationIds = new Set(
      subscriptions
        .map((subscription) => subscription.organization?.id)
        .filter((id): id is string => Boolean(id))
    );

    if (subscriptionToEdit?.organization?.id) {
      subscribedOrganizationIds.delete(subscriptionToEdit.organization.id);
    }

    return organizationsData.organizations.edges
      .map(({ node }) => node)
      .filter(({ id }) => !subscribedOrganizationIds.has(id));
  }, [organizationsData, subscriptions, subscriptionToEdit]);
};
