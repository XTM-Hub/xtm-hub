import {
  type IntegrationProductVersionFilterQueryVariables,
  useIntegrationProductVersionFilterQuery,
} from '@graphql/generated';

export const integrationProductVersionFilterKeys = {
  all: useIntegrationProductVersionFilterQuery.getRootKey,
  list: (variables: IntegrationProductVersionFilterQueryVariables) =>
    useIntegrationProductVersionFilterQuery.getKey(variables),
};
