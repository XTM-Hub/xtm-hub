import {
  type ServiceInstancesListQueryVariables,
  useServiceInstancesListQuery,
} from '@graphql/generated';

export const serviceInstancesKeys = {
  all: useServiceInstancesListQuery.getRootKey,
  list: (variables: ServiceInstancesListQueryVariables) =>
    useServiceInstancesListQuery.getKey(variables),
};

export const serviceUserCapabilitiesKeys = {
  all: () => ['service-user-capabilities'] as const,
  byService: (serviceInstanceId?: string) =>
    ['service-user-capabilities', serviceInstanceId] as const,
};
