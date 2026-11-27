import {
  type AdminServiceInstancesListQueryVariables,
  type ServiceInstancesListQueryVariables,
  type ServiceInstanceWithCapabilitiesByIdQueryVariables,
  type ServiceUserCapabilitiesQueryVariables,
  useAdminServiceInstancesListQuery,
  useServiceInstancesListQuery,
  useServiceInstanceWithCapabilitiesByIdQuery,
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

export const adminServiceInstancesKeys = {
  all: useAdminServiceInstancesListQuery.getRootKey,
  list: (variables: AdminServiceInstancesListQueryVariables) =>
    useAdminServiceInstancesListQuery.getKey(variables),
};

export const serviceInstanceWithCapabilitiesKeys = {
  all: useServiceInstanceWithCapabilitiesByIdQuery.getRootKey,
  byId: (variables: ServiceInstanceWithCapabilitiesByIdQueryVariables) =>
    useServiceInstanceWithCapabilitiesByIdQuery.getKey(variables),
};
