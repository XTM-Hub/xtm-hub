import { useOrganizationsListQuery } from '@graphql/generated';

export const organizationKeys = {
  all: useOrganizationsListQuery.getRootKey,
};
