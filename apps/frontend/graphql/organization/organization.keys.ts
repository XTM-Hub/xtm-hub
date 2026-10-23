import {
  type OrganizationsListQueryVariables,
  useOrganizationsListQuery,
} from '@graphql/generated';

export const organizationKeys = {
  all: useOrganizationsListQuery.getRootKey,
  list: (variables: OrganizationsListQueryVariables) =>
    useOrganizationsListQuery.getKey(variables),
};
