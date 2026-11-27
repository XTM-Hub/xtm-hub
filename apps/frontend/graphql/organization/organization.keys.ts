import {
  type OrganizationsAdminListQueryVariables,
  useOrganizationsAdminListQuery,
  useOrganizationsListQuery,
} from '@graphql/generated';

export const organizationKeys = {
  all: useOrganizationsListQuery.getRootKey,
};

export const adminOrganizationsKeys = {
  all: useOrganizationsAdminListQuery.getRootKey,
  list: (variables: OrganizationsAdminListQueryVariables) =>
    useOrganizationsAdminListQuery.getKey(variables),
};
