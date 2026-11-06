import {
  useMeAnalyticsQuery,
  useMeOrganizationDomainsQuery,
  useMeOrganizationsQuery,
} from '@graphql/generated';

export const meAnalyticsKeys = {
  detail: () => useMeAnalyticsQuery.getKey(),
};

export const meOrganizationDomainsKeys = {
  all: useMeOrganizationDomainsQuery.getRootKey,
  detail: () => useMeOrganizationDomainsQuery.getKey(),
};

export const meOrganizationsKeys = {
  all: useMeOrganizationsQuery.getRootKey,
  detail: () => useMeOrganizationsQuery.getKey(),
};
