import {
  type DocumentFacetsQueryVariables,
  useDocumentFacetsQuery,
} from '@graphql/generated';

export const documentFacetsKeys = {
  all: useDocumentFacetsQuery.getRootKey,
  list: (variables: DocumentFacetsQueryVariables) =>
    useDocumentFacetsQuery.getKey(variables),
};
