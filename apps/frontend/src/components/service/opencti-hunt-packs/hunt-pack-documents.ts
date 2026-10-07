import { ServiceContextProps } from '@/components/service/components/ServiceContext';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { HuntPackDocumentItemFragment } from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';

const HUNT_PACK_DOCUMENTS_QUERY_KEY = ['HuntPackDocuments'];
const HUNT_PACK_DOCUMENT_QUERY_KEY = ['HuntPackDocument'];
const DOCUMENT_FACETS_QUERY_KEY = ['DocumentFacets'];

/**
 * A hunt pack read with React Query, typed like the shared shareable resource
 * components expect: `HuntPackDocumentItem` selects the fields of
 * `documentItem_fragment` that apply to a hunt pack.
 */
export const toDocumentItem = (
  document: HuntPackDocumentItemFragment
): documentItem_fragment$data =>
  document as unknown as documentItem_fragment$data;

/**
 * The shared create, update and delete handlers of the hunt packs library,
 * followed by a refresh of the hunt pack queries and of the facet counts. A
 * deletion leaves the details query alone: its page navigates away.
 */
export const useHuntPackDocumentContext = (
  serviceInstance: serviceInstance_fragment$data
): ServiceContextProps => {
  const context = useDocumentContext({
    serviceInstance,
    type: ShareableResourceType.OPENCTI_HUNT_PACK,
  });
  const queryClient = useQueryClient();
  const refresh = (queryKeys: string[][]) => {
    for (const queryKey of queryKeys) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
  const afterSave = (onSuccess: (serviceName: string) => void) => {
    return (serviceName: string) => {
      refresh([
        HUNT_PACK_DOCUMENTS_QUERY_KEY,
        HUNT_PACK_DOCUMENT_QUERY_KEY,
        DOCUMENT_FACETS_QUERY_KEY,
      ]);
      onSuccess(serviceName);
    };
  };

  return {
    ...context,
    handleAddSheet: (values, onSuccess, onError) =>
      context.handleAddSheet(values, afterSave(onSuccess), onError),
    handleUpdateSheet: (values, resource, onSuccess, onError) =>
      context.handleUpdateSheet(
        values,
        resource,
        afterSave(onSuccess),
        onError
      ),
    handleDeleteSheet: (document, onCompleted) =>
      context.handleDeleteSheet(document, () => {
        refresh([HUNT_PACK_DOCUMENTS_QUERY_KEY, DOCUMENT_FACETS_QUERY_KEY]);
        onCompleted();
      }),
  };
};
