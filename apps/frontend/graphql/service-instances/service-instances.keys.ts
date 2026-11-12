import {
  type ServiceInstancesListQueryVariables,
  type ServiceUserCapabilitiesQueryVariables,
  useServiceInstancesListQuery,
  useServiceUserCapabilitiesQuery,
} from '@graphql/generated';

export const serviceInstancesKeys = {
  all: useServiceInstancesListQuery.getRootKey,
  list: (variables: ServiceInstancesListQueryVariables) =>
    useServiceInstancesListQuery.getKey(variables),
};

export const serviceUserCapabilitiesKeys = {
  all: useServiceUserCapabilitiesQuery.getRootKey,
  byService: (variables: ServiceUserCapabilitiesQueryVariables) =>
    useServiceUserCapabilitiesQuery.getKey(variables),
};
