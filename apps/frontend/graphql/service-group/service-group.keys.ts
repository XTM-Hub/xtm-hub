import {
  type BundleProductsQueryVariables,
  type BundleUserServiceGroupsQueryVariables,
  type ServiceGroupsQueryVariables,
  useBundleProductsQuery,
  useBundleUserServiceGroupsQuery,
  useServiceGroupsQuery,
} from '@graphql/generated';

export const bundleUserServiceGroupsKeys = {
  all: useBundleUserServiceGroupsQuery.getRootKey,
  list: (variables: BundleUserServiceGroupsQueryVariables) =>
    useBundleUserServiceGroupsQuery.getKey(variables),
};

export const bundleProductsKeys = {
  all: useBundleProductsQuery.getRootKey,
  list: (variables: BundleProductsQueryVariables) =>
    useBundleProductsQuery.getKey(variables),
};

export const serviceGroupsKeys = {
  all: useServiceGroupsQuery.getRootKey,
  list: (variables: ServiceGroupsQueryVariables) =>
    useServiceGroupsQuery.getKey(variables),
};
