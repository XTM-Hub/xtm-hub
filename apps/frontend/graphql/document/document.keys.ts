import {
  DocumentDetailQueryVariables,
  DocumentsListQueryVariables,
  useDocumentDetailQuery,
  useDocumentExistsQuery,
  useDocumentsListQuery,
  useMostDeployedDocumentsQueryQuery,
  usePublicDocumentsQuery,
} from '@graphql/generated';

export const homepageDocumentKeys = {
  mostDeployed: useMostDeployedDocumentsQueryQuery.getRootKey,
};

export const documentKeys = {
  listAll: useDocumentsListQuery.getRootKey,
  list: (variables: DocumentsListQueryVariables) =>
    useDocumentsListQuery.getKey(variables),
  detailAll: useDocumentDetailQuery.getRootKey,
  detail: (variables: DocumentDetailQueryVariables) =>
    useDocumentDetailQuery.getKey(variables),
  existsAll: useDocumentExistsQuery.getRootKey,
};

export const publicDocumentKeys = {
  listAll: usePublicDocumentsQuery.getRootKey,
};
