import { useMeOrganizationDomainsQuery } from '@graphql/generated';

export const meOrganizationDomainsKeys = {
  all: useMeOrganizationDomainsQuery.getRootKey,
  detail: () => useMeOrganizationDomainsQuery.getKey(),
};
